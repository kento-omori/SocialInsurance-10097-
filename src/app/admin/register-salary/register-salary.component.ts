import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { EmployeeProfile } from '../../interface/employee-company-profile';
import { UserService } from '../../services/user.service';
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, firstValueFrom } from 'rxjs';
import { debounceTime, switchMap, first } from 'rxjs/operators';
import { SalaryInfoService } from '../../services/salary-info.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { InsurancePremiumionService } from '../../services/insurance-premiumion.service';

@Component({
  selector: 'app-register-salary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-salary.component.html',
  styleUrl: './register-salary.component.css'
})
export class RegisterSalaryComponent implements OnInit {
  companyId: string = '';
  companyName: string = '';
  employeeId: string = '';
  employeeProfile: EmployeeProfile | null = null;
  salaryForm: FormGroup;
  selectedFile: File | null = null;
  csvPreview: any[] = [];
  uploadStatus: string = '';
  uploadProgress: number = 0;

  // 環境変数にあるURLを取得
  private functionsUrl = environment.functionsUrl;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private routeParamService: RouteParamService,
    private userService: UserService,
    private formBuilder: FormBuilder,
    private salaryInfoService: SalaryInfoService,
    private toast: ToastrService,
    private http: HttpClient,
    private insurancePremiumionService: InsurancePremiumionService
  ){
    this.salaryForm = this.formBuilder.group({
      employeeId: ['', {
        validators: [
          Validators.required,
          Validators.maxLength(20),
          Validators.pattern('^[a-zA-Z0-9-]+$')
        ],
        asyncValidators: [this.employeeIdExistsValidator(this.userService, this.companyId)],
        updateOn: 'blur'
      }],
      employeeName: ['', Validators.required],
      employeeAttribute: ['', Validators.required],
      qualification: ['', Validators.required],
      paymentDate: ['', Validators.required],
      paymentDays: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(0), Validators.max(31)]],
      salaryType: ['', Validators.required],
      fixedSalaryChange: ['', Validators.required],
      nonFixedSalaryChange: ['', Validators.required],
      currencyAmount: ['',[Validators.required,Validators.pattern(/^(0|[1-9][0-9]*)$/),Validators.min(0)]],
      nonCurrencyAmount: ['',[Validators.required,Validators.pattern(/^(0|[1-9][0-9]*)$/),Validators.min(0)]],
      socialInsuranceTotalAmount: [{value: '', disabled: true}, Validators.required],
      nonSocialInsuranceAmount:['',[Validators.required,Validators.pattern(/^(0|[1-9][0-9]*)$/),Validators.min(0)]],
      totalAmount: [{value: '', disabled: true}, Validators.required]
    });

  // 支給額の変更を監視して合計額を自動計算
  this.salaryForm.valueChanges.subscribe(() => {
      const currencyAmount = Number(this.salaryForm.get('currencyAmount')?.value || 0);
      const nonCurrencyAmount = Number(this.salaryForm.get('nonCurrencyAmount')?.value || 0);
      const nonSocialInsuranceAmount = Number(this.salaryForm.get('nonSocialInsuranceAmount')?.value || 0);

      // 社会保険算定対象総額の計算
      const socialInsuranceTotalAmount = currencyAmount + nonCurrencyAmount;
      this.salaryForm.get('socialInsuranceTotalAmount')?.setValue(socialInsuranceTotalAmount, { emitEvent: false });

      // 支給総額の計算
      const totalAmount = socialInsuranceTotalAmount + nonSocialInsuranceAmount;
      this.salaryForm.get('totalAmount')?.setValue(totalAmount, { emitEvent: false });
    });
  }

  async ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
    this.employeeProfile = await this.userService.getEmployeeProfile(this.companyId, this.employeeId);

    // 社員番号の変更を監視
    this.salaryForm.get('employeeId')?.valueChanges.subscribe(async (employeeId) => {
      if (employeeId) {
        try {
          const profile = await this.userService.getEmployeeProfile(this.companyId, employeeId);
          if (profile && profile.enrolmentData) {
            this.salaryForm.patchValue({
              employeeName: profile.lastName + ' ' + profile.firstName,
              employeeAttribute: profile.employeeAttribute,
              qualification: this.formatQualification(profile.insuredStatus)
            });
          } else {
            // 退職者または該当なしの場合はクリア
            this.clearEmployeeInfo();
          }
        } catch (error) {
          console.error('従業員情報の取得に失敗しました:', error);
          this.clearEmployeeInfo();
        }
      } else {
        this.clearEmployeeInfo();
      }
    });

    // 社員番号の存在チェック
    this.salaryForm.get('employeeId')?.setAsyncValidators(this.employeeIdExistsValidator(this.userService, this.companyId));
    this.salaryForm.get('employeeId')?.updateValueAndValidity();
  }

  // 従業員情報をクリアするメソッド
  private clearEmployeeInfo(): void {
    this.salaryForm.patchValue({
      employeeName: '',
      employeeAttribute: '',
      qualification: ''
    });
  }

  // フォーム送信時の処理
  async onSubmit(): Promise<void> {
    try {
      if (this.salaryForm.valid) {
        const formValue = this.salaryForm.value;
        
        // 数値に変換
        const currencyAmount = Number(formValue.currencyAmount);
        const nonCurrencyAmount = Number(formValue.nonCurrencyAmount);
        const nonSocialInsuranceAmount = Number(formValue.nonSocialInsuranceAmount);
        // 社会保険算定対象総額の計算（通貨支給額 + 現物支給額）
        const socialInsuranceTotalAmount = currencyAmount + nonCurrencyAmount;
        // 支給総額の計算（社会保険算定対象総額 + 社会保険非対象額）
        const totalAmount = socialInsuranceTotalAmount + nonSocialInsuranceAmount;
        
        // 数値型で送信
        const salaryInfo = {
          ...formValue,
          currencyAmount: currencyAmount,
          nonCurrencyAmount: nonCurrencyAmount,
          nonSocialInsuranceAmount: nonSocialInsuranceAmount,
          socialInsuranceTotalAmount: socialInsuranceTotalAmount,
          totalAmount: totalAmount
        };

        try {
          // 同じ支給年月と給与種類のデータが存在するかチェック
          const existingSalary = await this.salaryInfoService.getSalaryInfoByPaymentDateAndType(
            formValue.employeeId,
            formValue.paymentDate,
            formValue.salaryType
          );

          if (existingSalary) {
            // 既存データが存在する場合は更新
            await this.salaryInfoService.updateSalaryInfo({
              ...salaryInfo,
              id: existingSalary.id  // 既存のFirestoreドキュメントIDを使用
            });
            this.toast.success('給与情報の更新に成功しました');
          } else {
            // 新規データの場合は追加
            await this.salaryInfoService.addSalaryInfo(salaryInfo);
            this.toast.success('給与情報の追加に成功しました');
          }
          
          this.clearForm();

          // 保険料計算のトリガーを発火
          if (this.companyId) {
            this.insurancePremiumionService.triggerPremiumCalculation([{
              companyId: this.companyId,
              employeeId: formValue.employeeId,
              paymentDate: formValue.paymentDate,
              salaryType: formValue.salaryType
            }]);
          }
        } catch(error) {
          console.error('給与情報の処理に失敗しました:', error);
          this.toast.error('給与情報の処理に失敗しました');
        }
      }
    } catch(error) {
      console.error('給与情報の処理に失敗しました:', error);
      this.toast.error('給与情報の処理に失敗しました');
    }
  }

  clearForm(): void {
    this.salaryForm.reset();
  }

  // 管理者ホームに戻る
  goToAdminHome(): void {
    this.routeParamService.goToAdminHome();
  }

    // 資格情報のフォーマット
  private formatQualification(insuredStatus: string[]): string {
    const hasHealth = insuredStatus.includes('health');
    const hasPension = insuredStatus.includes('pension');
    
    if (hasHealth && hasPension) {
      return '健保・厚生';
    } else if (hasHealth) {
      return '健保';
    } else if (hasPension) {
      return '厚生';
    } else {
      return 'なし';
    }
  }

  // 非同期バリデータ
  employeeIdExistsValidator(userService: UserService, companyId: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      if (!value) {
        return of(null);
      }
      return of(value).pipe(
        debounceTime(300),
        switchMap(employeeId =>
          userService.getEmployeeProfile(companyId, employeeId).then(profile => {
            // enrolmentDataが存在する場合のみOK
            return profile && profile.enrolmentData ? null : { notFound: true };
          }).catch(() => ({ notFound: true }))
        ),
        first()
      );
    };
  }

  // 以下、CSVのロジック
  // CSVファイル選択時の処理
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.readCSVFile(this.selectedFile);
    }
  }

  // CSVファイルの読み込みとプレビュー表示
  private readCSVFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      await this.parseCSVContent(content);
    };
    reader.readAsText(file, 'UTF-8');
  }

  // CSVコンテンツのパース
  private async parseCSVContent(content: string): Promise<void> {
    const lines = content.split('\n');
    this.csvPreview = [];
    const employeeIds = new Set<string>();

    // まず社員番号を収集
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(',');
        if (columns.length >= 1) {
          const employeeId = columns[0].trim();
          if (employeeId) {
            employeeIds.add(employeeId);
          }
        }
      }
    }

    try {
      // 収集した社員番号の従業員情報を取得
      const companyId = this.routeParamService.getCompanyId();
      const employees = await this.userService.getEmployees(companyId);
      const employeeProfiles = employees
        .filter(emp => employeeIds.has(emp.employeeId))
        .reduce((acc, emp) => {
          acc[emp.employeeId] = emp;
          return acc;
        }, {} as { [key: string]: any });

      // 従業員情報を取得した後にCSVデータを処理
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const columns = line.split(',');
          if (columns.length >= 11) { // 必要なカラム数を11に変更
            const employeeId = columns[0].trim();
            const employeeProfile = employeeProfiles[employeeId];

            // 従業員情報が存在しない場合はスキップ
            if (!employeeProfile) {
              continue;
            }

            const previewRow = {
              employeeId: employeeId || '',
              employeeName: `${employeeProfile.lastName || ''} ${employeeProfile.firstName || ''}`.trim() || '不明',
              employeeAttribute: employeeProfile.employeeAttribute || '不明',
              qualification: this.formatQualification(employeeProfile.insuredStatus || []) || '不明',
              paymentDate: columns[1]?.trim() || '',
              paymentDays: columns[2]?.trim() || '0',
              salaryType: columns[3]?.trim() || '',
              fixedSalaryChange: columns[4]?.trim() || '',
              nonFixedSalaryChange: columns[5]?.trim() || '',
              currencyAmount: columns[6]?.trim() || '0',
              nonCurrencyAmount: columns[7]?.trim() || '0',
              socialInsuranceTotalAmount: columns[8]?.trim() || '0',
              nonSocialInsuranceAmount: columns[9]?.trim() || '0',
              totalAmount: columns[10]?.trim() || '0'
            };

            this.csvPreview.push(previewRow);
          }
        }
      }
    } catch (error) {
      console.error('CSVの処理中にエラーが発生しました:', error);
      this.toast.error('CSVの処理中にエラーが発生しました');
    }
  }

  // CSVファイルのアップロード
  async uploadCSV(): Promise<void> {
    if (!this.selectedFile) {
      this.toast.error('CSVファイルを選択してください');
      return;
    }

    this.companyName = this.employeeProfile?.companyName || '';

    try {
      this.uploadStatus = 'アップロード中...';
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const csvData = e.target?.result as string;
        const requestData = {
          companyId: this.companyId,
          companyName: this.companyName,
          csvData: csvData
        };

        // デバッグ用のログ出力
        console.log('送信データ:', requestData);

        this.http.post(environment.functionsUrl.salary, requestData, {
          reportProgress: true,
          observe: 'events'
        }).subscribe({
          next: async (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              this.uploadProgress = Math.round(100 * (event.loaded / (event.total || 1)));
            } else if (event.type === HttpEventType.Response) {
              const response = event.body as { success: boolean; message: string; count: { salary: number; bonus: number }; details?: any };
              if (response.success) {
                const totalCount = response.count.salary + response.count.bonus;
                const message = `CSVファイルのアップロードと保存が完了しました！（月額：${response.count.salary}件、賞与：${response.count.bonus}件、合計：${totalCount}件のデータを保存）`;
                this.uploadStatus = message;
                this.selectedFile = null;
                this.csvPreview = [];
                this.uploadProgress = 0;
                this.toast.success('給与情報の登録に成功しました');

                // 保険料計算のトリガーを発火（CSVの全従業員情報を渡す）
                if (this.companyId && this.csvPreview.length > 0) {
                  const calculations = this.csvPreview.map(row => ({
                    companyId: this.companyId,
                    employeeId: row.employeeId,
                    paymentDate: row.paymentDate,
                    salaryType: row.salaryType
                  }));
                  this.insurancePremiumionService.triggerPremiumCalculation(calculations);
                }
              } else {
                this.uploadStatus = `アップロードに失敗しました: ${response.message}`;
                console.error('エラーの詳細:', response.details);
                this.uploadProgress = 0;
              }
            }
          },
          error: (error) => {
            console.error('CSVファイルのアップロードに失敗しました:', error);
            // エラーの詳細を表示
            if (error.error?.message) {
              this.uploadStatus = `アップロードに失敗しました: ${error.error.message}`;
            } else {
              this.uploadStatus = `アップロードに失敗しました: ${error.message}`;
            }
            // エラーの詳細をコンソールに出力
            console.error('エラーの詳細:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message
            });
            this.uploadProgress = 0;
            this.csvPreview = [];
          }
        });
      };
      reader.readAsText(this.selectedFile, 'UTF-8');
    } catch (error) {
      console.error('CSVファイルのアップロードに失敗しました:', error);
      this.uploadStatus = `アップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.uploadProgress = 0;
      this.csvPreview = [];
    }
  }
}