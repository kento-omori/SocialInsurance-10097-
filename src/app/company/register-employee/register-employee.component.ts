import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { RouteParamService } from '../../services/route-param.service';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { EmployeeProfile } from '../../interface/employee-company-profile';
import { Observable } from 'rxjs';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

interface CSVPreviewRow {
  employeeId: string;
  employeeName: string;
  employeeAttribute: string;
  healthInsurance: boolean;
  pensionInsurance: boolean;
}

declare var bootstrap: any;

@Component({
  selector: 'app-register-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-employee.component.html',
  styleUrl: './register-employee.component.css'
})
export class RegisterEmployeeComponent implements OnInit, AfterViewInit {
  companyId: string = '';
  companyName: string = '';
  employeeForm: FormGroup;
  insuredStatus: string[] = [];
  employees: EmployeeProfile[] = [];
  retiredEmployees: EmployeeProfile[] = [];
  isEditMode: boolean = false;
  editingEmployeeId: string = '';
  editingEmployee: EmployeeProfile | null = null;
  showRetiredEmployees: boolean = false;
  selectedFile: File | null = null;
  csvPreview: CSVPreviewRow[] = [];
  uploadProgress: number = 0;
  uploadStatus: string = '';

  // 環境変数で管理
  private functionsUrl = environment.functionsUrl;

  constructor(
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private userService: UserService,
    private fb: FormBuilder,
    private http: HttpClient,
    private toast: ToastrService,
  ) {
    this.employeeForm = this.fb.group({
      employeeId: ['', [
        Validators.required,
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9-]+$')
      ], [this.employeeIdValidator()]],
      employeeName: ['', [
        Validators.required,
        Validators.maxLength(30),
        Validators.pattern('^[ぁ-んァ-ン一-龥々　]+$')
      ]],
      employeeAttribute: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.loadCompanyName();
    this.loadEmployees();
  }

  ngAfterViewInit() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl, {
        container: 'body',
        customClass: 'wide-popover'
      });
    });
  }

  // 会社名を取得するメソッド
  private async loadCompanyName(): Promise<void> {
    try {
      const company = await this.userService.getCompanyProfile(this.companyId);
      if (company) {
        this.companyName = company.companyName;
      }
    } catch (error) {
      console.error('会社情報の取得に失敗しました:', error);
    }
  }

  // 従業員一覧を取得するメソッド
  private async loadEmployees(): Promise<void> {
    try {
      const employees = await this.userService.getEmployees(this.companyId);
      this.employees = employees.filter(emp => emp.enrolmentData);
      this.retiredEmployees = employees.filter(emp => !emp.enrolmentData);
    } catch (error) {
      console.error('従業員一覧の取得に失敗しました:', error);
    }
  }

  // 退職者一覧の表示を切り替え
  toggleRetiredEmployees(): void {
    this.showRetiredEmployees = !this.showRetiredEmployees;
  }

  // 編集モードに切り替える
  editEmployee(employee: EmployeeProfile): void {
    // まず編集モードを有効化
    this.isEditMode = true;
    this.editingEmployeeId = employee.employeeId;
    this.editingEmployee = employee;
    
    // フォームをリセット
    this.employeeForm.reset();
    
    // 社員番号コントロールを無効化
    this.employeeForm.get('employeeId')?.disable();
    
    // 値を設定
    this.employeeForm.get('employeeId')?.setValue(employee.employeeId);
    this.employeeForm.get('employeeName')?.setValue(employee.employeeName);
    this.employeeForm.get('employeeAttribute')?.setValue(employee.employeeAttribute);
    
    this.insuredStatus = [...employee.insuredStatus];
  }

  // 編集モードをキャンセル
  cancelEdit(): void {
    this.isEditMode = false;
    this.editingEmployeeId = '';
    this.editingEmployee = null;
    this.employeeForm.reset();
    // 社員番号コントロールを有効化
    this.employeeForm.get('employeeId')?.enable();
    this.insuredStatus = [];
  }

  // 社会保険資格のチェックボックス変更時の処理
  onInsuranceChange(event: any, type: string): void {
    if (event.target.checked) {
      if (!this.insuredStatus.includes(type)) {
        this.insuredStatus.push(type);
      }
    } else {
      const index = this.insuredStatus.indexOf(type);
      if (index > -1) {
        this.insuredStatus.splice(index, 1);
      }
    }
  }

  // 社会保険資格のチェック状態を確認
  isInsuranceChecked(type: string): boolean {
    return this.insuredStatus.includes(type);
  }

  // フォーム送信時の処理
  async onSubmit(): Promise<void> {
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      const employee: EmployeeProfile = {
        companyId: this.companyId,
        companyName: this.companyName,
        employeeId: formValue.employeeId,
        employeeName: formValue.employeeName,
        employeeAttribute: formValue.employeeAttribute,
        insuredStatus: this.insuredStatus,
        enrolmentData: true,
        createdAt: new Date()
      };

      try {
        if (this.isEditMode) {
          // 更新処理
          await this.userService.createEmployeeProfile(this.companyId, employee);
          this.isEditMode = false;
          this.editingEmployeeId = '';
          this.editingEmployee = null;
        } else {
          // 新規登録処理
          await this.userService.createEmployeeProfile(this.companyId, employee);
        }
        this.employeeForm.reset();
        this.insuredStatus = [];
        await this.loadEmployees();
      } catch (error) {
        console.error('従業員情報の処理に失敗しました:', error);
      }
    }
  }

  // 退職処理
  async retireEmployee(): Promise<void> {
    if (this.editingEmployee && confirm(`${this.editingEmployee.employeeName}さんを退職処理しますか？`)) {
      try {
        await this.userService.retireEmployee(this.companyId, this.editingEmployee);
        this.isEditMode = false;
        this.editingEmployeeId = '';
        this.editingEmployee = null;
        this.employeeForm.reset();
        this.insuredStatus = [];
        await this.loadEmployees();
      } catch (error) {
        console.error('退職処理に失敗しました:', error);
      }
    }
  }

  // 社員番号の重複チェックバリデーター
  private employeeIdValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || this.isEditMode) {
        return new Observable(subscriber => subscriber.next(null));
      }
      return new Observable(subscriber => {
        this.userService.isEmployeeIdExists(this.companyId, control.value)
          .then(exists => {
            if (exists) {
              subscriber.next({ employeeIdExists: true });
            } else {
              subscriber.next(null);
            }
            subscriber.complete();
          })
          .catch(error => {
            console.error('社員番号の重複チェックに失敗しました:', error);
            subscriber.next(null);
            subscriber.complete();
          });
      });
    };
  }

  goHome(): void {
    this.routeParamService.goToCompanyHome();
  }

  // 以下、CSV読み込みに関するメソッド
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
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      this.parseCSVContent(content);
    };
    reader.readAsText(file, 'UTF-8');
  }

  // CSVコンテンツのパース
  private parseCSVContent(content: string): void {
    const lines = content.split('\n');
    this.csvPreview = [];

    // ヘッダー行をスキップして2行目から処理
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const columns = line.split(',');
        if (columns.length >= 5) {
          this.csvPreview.push({
            employeeId: columns[0].trim(),
            employeeName: columns[1].trim(),
            employeeAttribute: columns[2].trim(),
            healthInsurance: this.parseInsuranceStatus(columns[3].trim()),
            pensionInsurance: this.parseInsuranceStatus(columns[4].trim())
          });
        }
      }
    }
  }

  // 保険資格の文字列をbooleanに変換
  private parseInsuranceStatus(status: string): boolean {
    const positiveValues = ['健康保険', '厚生年金', '○', 'はい', 'true', '1'];
    return positiveValues.includes(status);
  }

  // CSVファイルのアップロード
  async uploadCSV(): Promise<void> {
    if (!this.selectedFile) {
      this.toast.error('CSVファイルを選択してください');
      return;
    }

    try {
      this.uploadStatus = 'アップロード中...';
      
      // CSVファイルの内容を読み込む
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const csvData = e.target?.result as string;
        
        // リクエストデータの作成
        const requestData = {
          companyId: this.companyId,
          companyName: this.companyName,
          csvData: csvData
        };

        this.http.post(environment.functionsUrl.employee, requestData, {
          reportProgress: true,
          observe: 'events'
        }).subscribe({
          next: async (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              this.uploadProgress = Math.round(100 * (event.loaded / (event.total || 1)));
            } else if (event.type === HttpEventType.Response) {
              const response = event.body as { success: boolean; message: string; count: number };
              if (response.success) {
                this.uploadStatus = `CSVファイルのアップロードと保存が完了しました！（${response.count}件のデータを保存）`;
                // フォームとプレビューのクリア
                this.selectedFile = null;
                this.csvPreview = [];
                this.uploadProgress = 0;
                // 従業員一覧の更新
                await this.loadEmployees();
              } else {
                this.uploadStatus = `アップロードに失敗しました: ${response.message}`;
                this.uploadProgress = 0;
              }
            }
          },
          error: (error) => {
            console.error('CSVファイルのアップロードに失敗しました:', error);
            this.uploadStatus = `アップロードに失敗しました: ${error.message}`;
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
