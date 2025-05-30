import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { RouteParamService } from '../../services/route-param.service';
import { JpyPipe } from '../view-salary/view-salary.component';
import { StandardRemuneration } from '../../interface/standard-remuneration';
import { StandardRemunerationService } from '../../services/standard-remuneration.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, first } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { InsuranceData, GradeEntry} from '../../services/insurance-data.service';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-standard-remuneration',
  standalone: true,
  imports: [CommonModule, JpyPipe, ReactiveFormsModule, FormsModule],
  templateUrl: './standard-remuneration.component.html',
  styleUrl: './standard-remuneration.component.css'
})
export class StandardRemunerationComponent implements OnInit {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  standardRemunerationList: StandardRemuneration[] | null = null;
  isInput: boolean = false;
  isEdit: boolean = false;
  editingId: string | null = null;
  standardRemunerationForm: FormGroup;
  gradeTable: GradeEntry[] = [];
  csvFile: File | null = null;
  csvError: string = '';
  csvPreview: any[] = [];
  uploadProgress: number = 0;
  uploadStatus: string = '';
  selectedPaymentDate: string = '';
  isLoading: boolean = false;

  private functionsUrl = environment.functionsUrl.standardRemuneration;

  constructor(
    private router: Router,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private standardRemunerationService: StandardRemunerationService,
    private userService: UserService,
    private fb: FormBuilder,
    private toast: ToastrService,
    private insuranceData: InsuranceData,
    private http: HttpClient
  ) {
    this.standardRemunerationForm = this.fb.group({
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
      salaryType: [{ value: '月額', disabled: true }],
      standardRemuneration: ['', [Validators.required, Validators.min(0)]],
      standardRemunerationGrade: ['', [Validators.required, Validators.min(1)]],
      standardRemunerationDate: ['', Validators.required]
    });

    // 標準報酬月額の変更を監視
    this.standardRemunerationForm.get('standardRemuneration')?.valueChanges.subscribe(value => {
      if (value) {
        const selectedGrade = this.gradeTable.find(grade => grade.standardMonthlyRemuneration === Number(value));
        if (selectedGrade) {
          this.standardRemunerationForm.patchValue({
            standardRemunerationGrade: selectedGrade.grade
          }, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit() {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);

    // 等級テーブルの取得
    this.gradeTable = InsuranceData.getGradeTable();

    this.standardRemunerationService.getAllStandardRemunerationInfo('月額').subscribe(
      (standardRemunerationList: StandardRemuneration[]) => {
        this.standardRemunerationList = standardRemunerationList;
      }
    );

    // 社員番号の変更を監視
    this.standardRemunerationForm.get('employeeId')?.valueChanges.subscribe(async (employeeId) => {
      if (employeeId && this.companyId) {
        try {
          const profile = await this.userService.getEmployeeProfile(this.companyId, employeeId);
          if (profile && profile.enrolmentData) {
            this.standardRemunerationForm.patchValue({
              employeeName: profile.lastName + '　' + profile.firstName,
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
    this.standardRemunerationForm.get('employeeId')?.setAsyncValidators(this.employeeIdExistsValidator(this.userService, this.companyId));
    this.standardRemunerationForm.get('employeeId')?.updateValueAndValidity();
  }

  loadData() {
    this.isLoading = true;
    this.standardRemunerationService.getLatestStandardRemunerationByDate('月額', this.selectedPaymentDate).subscribe({
      next: (standardRemunerationList: StandardRemuneration[]) => {
        this.standardRemunerationList = standardRemunerationList;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('標準報酬月額の取得に失敗しました:', error);
        this.isLoading = false;
      }
    });
  }

  // 従業員情報をクリアするメソッド
  private clearEmployeeInfo(): void {
    this.standardRemunerationForm.patchValue({
      employeeName: '',
      employeeAttribute: '',
      qualification: ''
    });
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
  employeeIdExistsValidator(userService: UserService, companyId: string | null): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;
      if (!value || !companyId) {
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

  ngOnDestroy() {
  }

  goToAllEmployeeList() {
    this.routeParamService.goToAllEmployeeList();
  }

  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }

  goToStandardRemunerationInput() {
    this.isInput = !this.isInput;
    if (!this.isInput) {
      this.isEdit = false;
      this.editingId = null;
      this.standardRemunerationForm.reset();
    }
  }

  editStandardRemuneration(standardRemuneration: StandardRemuneration) {
    this.isInput = true;
    this.isEdit = true;
    this.editingId = standardRemuneration.id || null;
    this.standardRemunerationForm.patchValue({
      employeeId: standardRemuneration.employeeId,
      employeeName: standardRemuneration.employeeName,
      employeeAttribute: standardRemuneration.employeeAttribute,
      qualification: standardRemuneration.qualification,
      standardRemuneration: Number(standardRemuneration.standardRemuneration),
      standardRemunerationGrade: Number(standardRemuneration.standardRemunerationGrade),
      standardRemunerationDate: standardRemuneration.standardRemunerationDate
    });
  }

  async deleteStandardRemuneration(standardRemuneration: StandardRemuneration) {
    if (confirm('この標準報酬月額を削除してもよろしいですか？')) {
      try {
        await this.standardRemunerationService.deleteStandardRemuneration(standardRemuneration.employeeId, standardRemuneration.id!);
        this.toast.success('標準報酬月額を削除しました');
        this.loadStandardRemunerationList();
      } catch (error) {
        console.error('標準報酬月額の削除に失敗しました:', error);
        this.toast.error('標準報酬月額の削除に失敗しました');
      }
    }
  }

  private loadStandardRemunerationList() {
    this.standardRemunerationService.getAllStandardRemunerationInfo('月額').subscribe(
      (standardRemunerationList: StandardRemuneration[]) => {
        this.standardRemunerationList = standardRemunerationList;
      }
    );
  }

  async onSubmit() {
    if (this.standardRemunerationForm.valid && this.companyId) {
      const formData = this.standardRemunerationForm.getRawValue();
      const standardRemuneration: Partial<StandardRemuneration> = {
        companyId: this.companyId,
        ...formData,
        standardRemuneration: Number(formData.standardRemuneration),
        standardRemunerationGrade: Number(formData.standardRemunerationGrade),
        createdAt: new Date()
      };

      try {
        await this.standardRemunerationService.addStandardRemuneration(
          formData.employeeId,
          standardRemuneration
        );
        this.toast.success('標準報酬月額の登録に成功しました');
        this.standardRemunerationForm.reset();
        this.isInput = false;
      } catch (error) {
        console.error('標準報酬月額の登録に失敗しました:', error);
        this.toast.error('標準報酬月額の登録に失敗しました');
      }
    }
  }

  // CSVファイルのアップロード関係
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.csvFile = input.files[0];
      this.readCSVFile(this.csvFile);
    }
  }

  private readCSVFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      await this.parseCSVContent(content);
    };
    reader.readAsText(file, 'UTF-8');
  }

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
      const employees = await this.userService.getEmployees(this.companyId!);
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
          if (columns.length >= 3) {
            const employeeId = columns[0].trim();
            const salaryType = columns[1].trim();
            const standardRemuneration = parseInt(columns[2].trim());
            const standardRemunerationDate = columns[3].trim();
            const employeeProfile = employeeProfiles[employeeId];

            // 従業員情報が存在しない場合はスキップ
            if (!employeeProfile) {
              continue;
            }

            // 標準報酬月額から等級を取得（月額の場合のみ）
            let selectedGrade = null;
            if (salaryType === '月額') {
              selectedGrade = this.gradeTable.find(grade => 
                grade.standardMonthlyRemuneration === standardRemuneration
              );

              if (!selectedGrade) {
                continue;
              }
            } else if (salaryType === '賞与') {
              // 賞与の場合、1,000円未満が切り捨てられた数字かチェック
              if (standardRemuneration % 1000 !== 0) {
                continue;
              }
            }

            // 同じ社員番号と報酬種類の組み合わせが既に存在するかチェック
            const existingIndex = this.csvPreview.findIndex(
              row => row.employeeId === employeeId && 
                    row.salaryType === salaryType && 
                    row.standardRemunerationDate === standardRemunerationDate
            );

            const previewRow = {
              employeeId: employeeId || '',
              employeeName: `${employeeProfile.lastName || ''} ${employeeProfile.firstName || ''}`.trim() || '不明',
              employeeAttribute: employeeProfile.employeeAttribute || '不明',
              qualification: this.formatQualification(employeeProfile.insuredStatus || []) || '不明',
              salaryType: salaryType || '不明',
              standardRemuneration: standardRemuneration || 0,
              standardRemunerationGrade: selectedGrade?.grade || '',
              standardRemunerationDate: standardRemunerationDate || ''
            };

            if (existingIndex !== -1) {
              // 既存の行を更新
              this.csvPreview[existingIndex] = previewRow;
            } else {
              // 新しい行を追加
              this.csvPreview.push(previewRow);
            }
          }
        }
      }
    } catch (error) {
      console.error('CSVの処理中にエラーが発生しました:', error);
      this.toast.error('CSVの処理中にエラーが発生しました');
    }
  }

  async onCsvSubmit(): Promise<void> {
    if (!this.csvFile) {
      this.toast.error('CSVファイルを選択してください');
      return;
    }

    try {
      this.uploadStatus = 'アップロード中...';
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const csvData = e.target?.result as string;
        const requestData = {
          companyId: this.companyId,
          csvData: csvData
        };

        this.http.post(this.functionsUrl, requestData, {
          reportProgress: true,
          observe: 'events'
        }).subscribe({
          next: async (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              this.uploadProgress = Math.round(100 * (event.loaded / (event.total || 1)));
            } else if (event.type === HttpEventType.Response) {
              const response = event.body as { success: boolean; message: string; count: number; details?: any };
              if (response.success) {
                const count = typeof response.count === 'object' ? JSON.stringify(response.count) : response.count;
                this.uploadStatus = `CSVファイルのアップロードと保存が完了しました！（${count}件のデータを保存）`;
                this.csvFile = null;
                this.csvPreview = [];
                this.uploadProgress = 0;
                this.loadStandardRemunerationList();
                this.toast.success('標準報酬月額の登録に成功しました');
              } else {
                this.uploadStatus = `アップロードに失敗しました: ${response.message}`;
                console.error('エラーの詳細:', response.details);
                this.toast.error('標準報酬月額の登録に失敗しました'); 
                this.uploadProgress = 0;
              }
            }
          },
          error: (error) => {
            console.error('CSVファイルのアップロードに失敗しました:', error);
            this.toast.error('標準報酬月額の登録に失敗しました');
            if (error.error?.message) {
              this.uploadStatus = `アップロードに失敗しました: ${error.error.message}`;
            } else {
              this.uploadStatus = `アップロードに失敗しました: ${error.message}`;
            }
            console.error('エラーの詳細:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message
            });
            this.toast.error(error.error,error.message);
            this.uploadProgress = 0;
            this.csvPreview = [];
          }
        });
      };
      reader.readAsText(this.csvFile, 'UTF-8');
    } catch (error) {
      console.error('CSVファイルのアップロードに失敗しました:', error);
      this.toast.error('標準報酬月額の登録に失敗しました');
      this.uploadStatus = `アップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.uploadProgress = 0;
      this.csvPreview = [];
    }
  }
}
