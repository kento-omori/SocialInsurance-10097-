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
import { Office } from '../../interface/office.interface';
import { CompanyService } from '../../services/company.service';

interface CSVPreviewRow {
  employeeId: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  birthEra: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: string;
  employeeAttribute: string;
  healthInsurance: boolean;
  pensionInsurance: boolean;
  office: string;
  department: string;
  rank: string;
  hireEra: string;
  hireYear: string;
  hireMonth: string;
  hireDay: string;
  retireEra?: string;
  retireYear?: string;
  retireMonth?: string;
  retireDay?: string;
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
  officeList: Office[] = [];
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

    // 和暦の選択肢（最大年数も定義）
    eraList = [
      { value: '昭和', startYear: 1926, endYear: 1989, maxYear: 64 },
      { value: '平成', startYear: 1989, endYear: 2019, maxYear: 31 },
      { value: '令和', startYear: 2019, endYear: 9999, maxYear: 20 }
    ];  

  constructor(
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private userService: UserService,
    private fb: FormBuilder,
    private http: HttpClient,
    private toast: ToastrService,
    private companyService: CompanyService
  ) {
    this.employeeForm = this.fb.group({
      employeeId: ['', [
        Validators.required,
        Validators.maxLength(20),
        Validators.pattern('^[a-zA-Z0-9-]+$')
      ], [this.employeeIdValidator()]],
      lastName: ['', [Validators.required, Validators.pattern('^[ぁ-んァ-ン一-龥々ー]+$')]],
      firstName: ['', [Validators.required, Validators.pattern('^[ぁ-んァ-ン一-龥々ー]+$')]],
      lastNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      firstNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      birthEra: ['', Validators.required],
      birthYear: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
      birthMonth: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
      birthDay: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]],
      gender: ['', Validators.required],
      employeeAttribute: ['', Validators.required],
      office: ['', Validators.required],
      rank: ['', Validators.required],
      department: ['', Validators.required],
      hireEra: ['', Validators.required],
      hireYear: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
      hireMonth: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
      hireDay: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]],
      retireEra: [''],
      retireYear: ['', [Validators.pattern('^[0-9]{1,2}$')]],
      retireMonth: ['', [Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
      retireDay: ['', [Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]]
    });
    // 和暦が変更されたときに年のバリデーションを更新
    this.employeeForm.get('birthEra')?.valueChanges.subscribe(era => {
      const yearControl = this.employeeForm.get('birthYear');
      if (yearControl) {
        const selectedEra = this.eraList.find(e => e.value === era);
            if (selectedEra) {
              yearControl.setValidators([
                Validators.required,
                Validators.pattern('^[0-9]{1,2}$'),
                Validators.min(1),
                Validators.max(selectedEra.maxYear)
              ]);
              yearControl.updateValueAndValidity();
            }
        }
    });
  }

  async ngOnInit(): Promise<void> {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.loadCompanyName();
    this.loadEmployees();
    this.routeParamService.companyId$.subscribe(async companyId => {
      if (companyId) {
        this.companyService.setCompanyId(companyId);
        try {
          this.officeList = await this.companyService.getOffices();
        } catch (error) {
          console.error('事業所一覧の取得に失敗しました:', error);
          this.toast.error('事業所一覧の取得に失敗しました。');
        }
      }
    });
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
    this.employeeForm.get('lastName')?.setValue(employee.lastName);
    this.employeeForm.get('firstName')?.setValue(employee.firstName);
    this.employeeForm.get('lastNameKana')?.setValue(employee.lastNameKana);
    this.employeeForm.get('firstNameKana')?.setValue(employee.firstNameKana);
    this.employeeForm.get('birthEra')?.setValue(employee.birthEra);
    this.employeeForm.get('birthYear')?.setValue(employee.birthYear);
    this.employeeForm.get('birthMonth')?.setValue(employee.birthMonth);
    this.employeeForm.get('birthDay')?.setValue(employee.birthDay);
    this.employeeForm.get('employeeAttribute')?.setValue(employee.employeeAttribute);
    this.employeeForm.get('office')?.setValue(employee.office);
    this.employeeForm.get('rank')?.setValue(employee.rank);
    this.employeeForm.get('department')?.setValue(employee.department);
    this.employeeForm.get('hireEra')?.setValue(employee.hireEra);
    this.employeeForm.get('hireYear')?.setValue(employee.hireYear);
    this.employeeForm.get('hireMonth')?.setValue(employee.hireMonth);
    this.employeeForm.get('hireDay')?.setValue(employee.hireDay);
    this.employeeForm.get('retireEra')?.setValue(employee.retireEra || '');
    this.employeeForm.get('retireYear')?.setValue(employee.retireYear || '');
    this.employeeForm.get('retireMonth')?.setValue(employee.retireMonth || '');
    this.employeeForm.get('retireDay')?.setValue(employee.retireDay || '');
    this.employeeForm.get('gender')?.setValue(employee.gender)

    // 保険資格の設定
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
    this.validateBirthDate();
    this.validateHireDate();
    this.validateRetireDate();

    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      const employee: EmployeeProfile = {
        companyId: this.companyId,
        companyName: this.companyName,
        employeeId: formValue.employeeId,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        firstNameKana: formValue.firstNameKana,
        lastNameKana: formValue.lastNameKana,
        birthEra: formValue.birthEra,
        birthYear: formValue.birthYear,
        birthMonth: formValue.birthMonth,
        birthDay: formValue.birthDay,
        gender: formValue.gender,
        employeeAttribute: formValue.employeeAttribute,
        insuredStatus: this.insuredStatus,
        office: formValue.office,
        officeName: this.officeList.find(o => o.id === formValue.office)?.officeName || '',
        prefecture: this.officeList.find(o => o.id === formValue.office)?.prefecture || '',
        bulkApprovalType: this.officeList.find(o => o.id === formValue.office)?.bulkApprovalType || '',
        rank: formValue.rank,
        department: formValue.department,
        hireEra: formValue.hireEra,
        hireYear: formValue.hireYear,
        hireMonth: formValue.hireMonth,
        hireDay: formValue.hireDay,
        retireEra: formValue.retireEra || '',
        retireYear: formValue.retireYear || '',
        retireMonth: formValue.retireMonth || '',
        retireDay: formValue.retireDay || '',
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
          this.toast.success('従業員情報を更新しました。');
        } else {
          // 新規登録処理
          await this.userService.createEmployeeProfile(this.companyId, employee);
          this.toast.success('従業員情報を登録しました。');
        }
        this.employeeForm.reset();
        this.insuredStatus = [];
        await this.loadEmployees();
      } catch (error) {
        console.error('従業員情報の処理に失敗しました:', error);
        this.toast.error('従業員情報の処理に失敗しました。また、退社日が入力された状態で更新はできません。');
      }
    }
  }

  // 退職処理
  async retireEmployee(): Promise<void> {
    if (this.editingEmployee) {
      // 退職日のバリデーション
      this.validateRetireDate();
      
      if (this.employeeForm.get('retireEra')?.errors || 
          this.employeeForm.get('retireYear')?.errors || 
          this.employeeForm.get('retireMonth')?.errors || 
          this.employeeForm.get('retireDay')?.errors) {
        this.toast.error('退職日の入力に誤りがあります');
        return;
      }

      if (confirm(`${this.editingEmployee.lastName} ${this.editingEmployee.firstName}さんを退職処理しますか？`)) {
        try {
          // 退職情報を更新
          const updatedEmployee = {
            ...this.editingEmployee,
            retireEra: this.employeeForm.get('retireEra')?.value,
            retireYear: this.employeeForm.get('retireYear')?.value,
            retireMonth: this.employeeForm.get('retireMonth')?.value,
            retireDay: this.employeeForm.get('retireDay')?.value,
            enrolmentData: false
          };

          await this.userService.retireEmployee(this.companyId, updatedEmployee);
          this.isEditMode = false;
          this.editingEmployeeId = '';
          this.editingEmployee = null;
          this.employeeForm.reset();
          this.insuredStatus = [];
          await this.loadEmployees();
          this.toast.success('退職処理が完了しました');
        } catch (error) {
          console.error('退職処理に失敗しました:', error);
          this.toast.error('退職処理に失敗しました');
        }
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

    // 生年月日のバリデーション
  public validateBirthDate(): void {
    const era = this.employeeForm.get('birthEra')?.value;
    const year = parseInt(this.employeeForm.get('birthYear')?.value);
    const month = parseInt(this.employeeForm.get('birthMonth')?.value);
    const day = parseInt(this.employeeForm.get('birthDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.employeeForm.get('birthYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.employeeForm.get('birthDay')?.setErrors({ 'invalidDay': true });
        }
      }
    }
  }

  // 和暦を西暦に変換する関数
  public convertToWesternYear(era: string, year: number): number {
    const selectedEra = this.eraList.find(e => e.value === era);
    if (selectedEra) {
      return selectedEra.startYear + year - 1;
    }
    return 0;
  }

  // 日付の比較を行う関数
  public compareDates(era1: string, year1: number, month1: number, day1: number,
                      era2: string, year2: number, month2: number, day2: number): number {
    const westernYear1 = this.convertToWesternYear(era1, year1);
    const westernYear2 = this.convertToWesternYear(era2, year2);
    
    const date1 = new Date(westernYear1, month1 - 1, day1);
    const date2 = new Date(westernYear2, month2 - 1, day2);
    
    return date1.getTime() - date2.getTime();
  }

  // 入社日のバリデーション
  public validateHireDate(): void {
    const era = this.employeeForm.get('hireEra')?.value;
    const year = parseInt(this.employeeForm.get('hireYear')?.value);
    const month = parseInt(this.employeeForm.get('hireMonth')?.value);
    const day = parseInt(this.employeeForm.get('hireDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.employeeForm.get('hireYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.employeeForm.get('hireDay')?.setErrors({ 'invalidDay': true });
        }

        // 退社日との比較
        const retireEra = this.employeeForm.get('retireEra')?.value;
        const retireYear = parseInt(this.employeeForm.get('retireYear')?.value);
        const retireMonth = parseInt(this.employeeForm.get('retireMonth')?.value);
        const retireDay = parseInt(this.employeeForm.get('retireDay')?.value);

        if (retireEra && retireYear && retireMonth && retireDay) {
          const comparison = this.compareDates(era, year, month, day, retireEra, retireYear, retireMonth, retireDay);
          if (comparison > 0) {
            this.employeeForm.get('hireYear')?.setErrors({ 'invalidDateOrder': true });
          }
        }
      }
    }
  }

  // 退社日のバリデーション
  public validateRetireDate(): void {
    const era = this.employeeForm.get('retireEra')?.value;
    const year = parseInt(this.employeeForm.get('retireYear')?.value);
    const month = parseInt(this.employeeForm.get('retireMonth')?.value);
    const day = parseInt(this.employeeForm.get('retireDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.employeeForm.get('retireYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.employeeForm.get('retireDay')?.setErrors({ 'invalidDay': true });
        }

        // 入社日との比較
        const hireEra = this.employeeForm.get('hireEra')?.value;
        const hireYear = parseInt(this.employeeForm.get('hireYear')?.value);
        const hireMonth = parseInt(this.employeeForm.get('hireMonth')?.value);
        const hireDay = parseInt(this.employeeForm.get('hireDay')?.value);

        if (hireEra && hireYear && hireMonth && hireDay) {
          const comparison = this.compareDates(hireEra, hireYear, hireMonth, hireDay, era, year, month, day);
          if (comparison > 0) {
            this.employeeForm.get('retireYear')?.setErrors({ 'invalidDateOrder': true });
          }
        }
      }
    }
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
        if (columns.length >= 20) {
          this.csvPreview.push({
            employeeId: columns[0].trim(),
            lastName: columns[1].trim(),
            firstName: columns[2].trim(),
            lastNameKana: columns[3].trim(),
            firstNameKana: columns[4].trim(),
            birthEra: columns[5].trim(),
            birthYear: columns[6].trim(),
            birthMonth: columns[7].trim(),
            birthDay: columns[8].trim(),
            gender: columns[9].trim(),
            employeeAttribute: columns[10].trim(),
            healthInsurance: this.parseInsuranceStatus(columns[11].trim()),
            pensionInsurance: this.parseInsuranceStatus(columns[12].trim()),
            office: columns[13].trim(),
            department: columns[14].trim(),
            rank: columns[15].trim(),
            hireEra: columns[16].trim(),
            hireYear: columns[17].trim(),
            hireMonth: columns[18].trim(),
            hireDay: columns[19].trim(),
            retireEra: columns[20].trim(),
            retireYear: columns[21].trim(),
            retireMonth: columns[22].trim(),
            retireDay: columns[23].trim()
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
