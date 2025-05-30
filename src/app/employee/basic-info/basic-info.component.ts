import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouteParamService } from '../../services/route-param.service';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { Office } from '../../interface/office.interface';
import { UserService } from '../../services/user.service';
import { EmployeeProfile } from '../../interface/employee-company-profile';
import { EmployeeService } from '../../services/employee.service';
import { BasicInfo } from '../../interface/employee-info';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-basic-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './basic-info.component.html',
  styleUrl: './basic-info.component.css'
})
export class BasicInfoComponent implements OnInit, OnDestroy {
  basicInfoForm!: FormGroup;
  basicInfoList: BasicInfo[] = [];
  errorMessage = '';
  officeList: Office[] = [];
  employeeProfile: EmployeeProfile | null = null;
  isViewMode = false;
  isEditMode = false;
  basicInfoSub!: Subscription;
  selectedMyNumberFile: { url?: string; name: string; file?: File }[] | null = [];
  selectedBasicPensionNumberFile: { url?: string; name: string; file?: File }[] | null = [];
  myNumberFileUrls: string[] = [];
  basicPensionNumberFileUrls: string[] = [];
  deletedMyNumberFileUrls: string[] = [];
  deletedBasicPensionNumberFileUrls: string[] = [];
  familySelectedMyNumberFiles: { url?: string; name: string; file?: File }[][] = [];
  familySelectedBasicPensionNumberFiles: { url?: string; name: string; file?: File }[][] = [];
  familyDeletedMyNumberFileUrls: string[][] = [];
  familyDeletedBasicPensionNumberFileUrls: string[][] = [];

  // 和暦の選択肢（最大年数も定義）
  eraList = [
    { value: '昭和', startYear: 1926, endYear: 1989, maxYear: 64 },
    { value: '平成', startYear: 1989, endYear: 2019, maxYear: 31 },
    { value: '令和', startYear: 2019, endYear: 9999, maxYear: 20 }
  ];

  constructor(
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private companyService: CompanyService,
    private userService: UserService,
    private employeeService: EmployeeService,
    private toastr: ToastrService
  ) {
    this.basicInfoForm = this.fb.group({
      // 従業員情報
      employeeInfo: this.fb.group({
        lastName: ['', [Validators.required, Validators.pattern('^[^\\s]+$')]],
        firstName: ['', [Validators.required, Validators.pattern('^[^\\s]+$')]],
        lastNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
        firstNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
        birthEra: ['', Validators.required],
        birthYear: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
        birthMonth: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
        birthDay: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]],
        gender: ['', Validators.required],
        postalCode1: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]],
        postalCode2: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
        address: ['', [Validators.required]],
        addressKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー0-9\\-\\sA-Za-z]+$')]],
        phone: [''],
        email: ['', [Validators.email]],
        myNumber: ['', [
          Validators.required,
          Validators.pattern('^[0-9]{12}$'),
          Validators.minLength(12),
          Validators.maxLength(12)
        ]],
        myNumberFileUrls: [''],
        myNumberFileName: [''],
        basicPensionNumber: ['', [
          Validators.required,
          Validators.pattern('^[0-9]{10}$'),
          Validators.minLength(10),
          Validators.maxLength(10)
        ]],
        basicPensionNumberFileUrls: [''],
        basicPensionNumberFileName: [''],
      }),
      // 入退社情報
      employmentInfo: this.fb.group({
        enrolmentData: ['', Validators.required],
        hireEra: ['', Validators.required],
        hireYear: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
        hireMonth: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
        hireDay: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]],
        retireEra: [''],
        retireYear: ['', [Validators.pattern('^[0-9]{1,2}$')]],
        retireMonth: ['', [Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
        retireDay: ['', [Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]]
      }),
      // 営業所情報
      officeInfo: this.fb.group({
        office: [''],
        employeeNumber: [''],
        employeeAttribute: [''],
        rank: [''],
        department: ['']
      }),
      // 通勤手当
      commuteInfo: this.fb.group({
        commuteSection: [''],
        commutePass: ['']
      }),
      // 家族情報の配列
      familyMembers: this.fb.array([])
    });

    // 和暦が変更されたときに年のバリデーションを更新
    this.basicInfoForm.get('birthEra')?.valueChanges.subscribe(era => {
      const yearControl = this.basicInfoForm.get('birthYear');
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

  // 家族メンバーのフォーム配列を取得
  get familyMembersArray() {
    return this.basicInfoForm.get('familyMembers') as FormArray;
  }

  // 家族メンバーを追加
  addFamilyMember() {
    const familyMember = this.fb.group({
      familySupport: ['', Validators.required],
      familyDisabilityHandicap: ['', Validators.required],
      familyName: ['', [Validators.required, Validators.pattern('^[^\\s]+$')]],
      familyFirstName: ['', [Validators.required, Validators.pattern('^[^\\s]+$')]],
      familyNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      familyFirstNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      familyRelationship: ['', Validators.required],
      familyGender: ['', Validators.required],
      familyLivingTogether: ['', Validators.required],
      familyBirthEra: ['', Validators.required],
      familyBirthYear: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
      familyBirthMonth: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(12)]],
      familyBirthDay: ['', [Validators.required, Validators.pattern('^[0-9]{1,2}$'), Validators.min(1), Validators.max(31)]],
      familyPostalCode1: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]],
      familyPostalCode2: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      familyAddress: ['', Validators.required],
      familyAddressKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー0-9\\-\\sA-Za-z]+$')]],
      familyMyNumber: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{12}$'),
        Validators.minLength(12),
        Validators.maxLength(12)
      ]],
      familyMyNumberFile: [''],
      familyMyNumberFileName: [''],
      familyBasicPensionNumber: ['', [
        Validators.pattern('^[0-9]{10}$'),
        Validators.minLength(10),
        Validators.maxLength(10)
      ]],
      familyBasicPensionNumberFile: [''],
      familyBasicPensionNumberFileName: [''],
      familyIncome: ['', [
        Validators.required,
        Validators.pattern('^(0|[1-9][0-9]*)$')
      ]]
    });

    this.familyMembersArray.push(familyMember);
  }

  // 家族メンバーを削除
  removeFamilyMember(index: number) {
    this.familyMembersArray.removeAt(index);
  }

  async ngOnInit() {
    // 初期化時に一度だけセット
    this.routeParamService.setCompanyId(this.route);
    this.routeParamService.setEmployeeId(this.route);
    // companyId, employeeIdの購読
    this.routeParamService.companyId$.subscribe(async companyId => {
      if (companyId) {
        this.companyService.setCompanyId(companyId);
        try {
          this.officeList = await this.companyService.getOffices();
        } catch (error) {
          console.error('事業所一覧の取得に失敗しました:', error);
          this.errorMessage = '事業所一覧の取得に失敗しました。';
        }
      }
    });

    this.routeParamService.employeeId$.subscribe(async employeeId => {
      const companyId = this.routeParamService.getCompanyId();
      if (companyId && employeeId) {
        try {
          this.employeeProfile = await this.userService.getEmployeeProfile(companyId, employeeId);
          // 氏名を分割してフォームにセット
          if (this.employeeProfile?.lastName && this.employeeProfile?.firstName) {
            this.basicInfoForm.get('employeeInfo.lastName')?.setValue(this.employeeProfile.lastName || '');
            this.basicInfoForm.get('employeeInfo.firstName')?.setValue(this.employeeProfile.firstName || '');
          }
          if (this.employeeProfile?.employeeAttribute) {
            this.basicInfoForm.get('officeInfo.employeeAttribute')?.setValue(this.employeeProfile.employeeAttribute);
          }
          if (this.employeeProfile?.enrolmentData) {
            this.basicInfoForm.get('employmentInfo.enrolmentData')?.setValue(this.employeeProfile.enrolmentData);
          }
          if (this.employeeProfile?.employeeId) {
            this.basicInfoForm.get('officeInfo.employeeNumber')?.setValue(this.employeeProfile.employeeId);
          }
        } catch (error) {
          console.error('従業員プロフィールの取得に失敗しました:', error);
          this.errorMessage = '従業員プロフィールの取得に失敗しました。';
        }
        try {
          this.basicInfoSub = this.employeeService.getBasicInfoRealtime().subscribe(list => {
            this.basicInfoList = list;
            // 必要なら氏名などもここで再セット
          });
        } catch (error) {
          console.error('基本情報履歴の取得に失敗しました:', error);
          this.errorMessage = '基本情報履歴の取得に失敗しました。';
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.basicInfoSub) {
      this.basicInfoSub.unsubscribe();
    }
  }

  goToEmployeeHome() {
    this.routeParamService.goToEmployeeHome();
  }

  // 生年月日のバリデーション
  validateBirthDate(): void {
    const era = this.basicInfoForm.get('birthEra')?.value;
    const year = parseInt(this.basicInfoForm.get('birthYear')?.value);
    const month = parseInt(this.basicInfoForm.get('birthMonth')?.value);
    const day = parseInt(this.basicInfoForm.get('birthDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.basicInfoForm.get('birthYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.basicInfoForm.get('birthDay')?.setErrors({ 'invalidDay': true });
        }
      }
    }
  }

  // 和暦を西暦に変換する関数
  private convertToWesternYear(era: string, year: number): number {
    const selectedEra = this.eraList.find(e => e.value === era);
    if (selectedEra) {
      return selectedEra.startYear + year - 1;
    }
    return 0;
  }

  // 日付の比較を行う関数
  private compareDates(era1: string, year1: number, month1: number, day1: number,
                      era2: string, year2: number, month2: number, day2: number): number {
    const westernYear1 = this.convertToWesternYear(era1, year1);
    const westernYear2 = this.convertToWesternYear(era2, year2);
    
    const date1 = new Date(westernYear1, month1 - 1, day1);
    const date2 = new Date(westernYear2, month2 - 1, day2);
    
    return date1.getTime() - date2.getTime();
  }

  // 入社日のバリデーション
  validateHireDate(): void {
    const era = this.basicInfoForm.get('hireEra')?.value;
    const year = parseInt(this.basicInfoForm.get('hireYear')?.value);
    const month = parseInt(this.basicInfoForm.get('hireMonth')?.value);
    const day = parseInt(this.basicInfoForm.get('hireDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.basicInfoForm.get('hireYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.basicInfoForm.get('hireDay')?.setErrors({ 'invalidDay': true });
        }

        // 退社日との比較
        const retireEra = this.basicInfoForm.get('retireEra')?.value;
        const retireYear = parseInt(this.basicInfoForm.get('retireYear')?.value);
        const retireMonth = parseInt(this.basicInfoForm.get('retireMonth')?.value);
        const retireDay = parseInt(this.basicInfoForm.get('retireDay')?.value);

        if (retireEra && retireYear && retireMonth && retireDay) {
          const comparison = this.compareDates(era, year, month, day, retireEra, retireYear, retireMonth, retireDay);
          if (comparison > 0) {
            this.basicInfoForm.get('hireYear')?.setErrors({ 'invalidDateOrder': true });
          }
        }
      }
    }
  }

  // 退社日のバリデーション
  validateRetireDate(): void {
    const era = this.basicInfoForm.get('retireEra')?.value;
    const year = parseInt(this.basicInfoForm.get('retireYear')?.value);
    const month = parseInt(this.basicInfoForm.get('retireMonth')?.value);
    const day = parseInt(this.basicInfoForm.get('retireDay')?.value);

    if (era && year && month && day) {
      const selectedEra = this.eraList.find(e => e.value === era);
      if (selectedEra) {
        // 年の範囲チェック
        if (year < 1 || year > selectedEra.maxYear) {
          this.basicInfoForm.get('retireYear')?.setErrors({ 'invalidYear': true });
        }

        // 月の日数チェック
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          this.basicInfoForm.get('retireDay')?.setErrors({ 'invalidDay': true });
        }

        // 入社日との比較
        const hireEra = this.basicInfoForm.get('hireEra')?.value;
        const hireYear = parseInt(this.basicInfoForm.get('hireYear')?.value);
        const hireMonth = parseInt(this.basicInfoForm.get('hireMonth')?.value);
        const hireDay = parseInt(this.basicInfoForm.get('hireDay')?.value);

        if (hireEra && hireYear && hireMonth && hireDay) {
          const comparison = this.compareDates(hireEra, hireYear, hireMonth, hireDay, era, year, month, day);
          if (comparison > 0) {
            this.basicInfoForm.get('retireYear')?.setErrors({ 'invalidDateOrder': true });
          }
        }
      }
    }
  }

  // 登録ボタン
  async onSubmit(): Promise<void> {
    this.validateBirthDate();
    this.validateHireDate();
    this.validateRetireDate();
    
    if (this.basicInfoForm.valid) {
      this.errorMessage = '';

      // ファイルアップロード（マイナンバー）
      let myNumberFileUrls: string[] = [];
      if (this.selectedMyNumberFile && this.selectedMyNumberFile.length > 0) {
        for (const fileObj of this.selectedMyNumberFile) {
          if (fileObj.file) {
            // 新規ファイル
            const url = await this.employeeService.uploadFile(fileObj.file, 'myNumberFile');
            myNumberFileUrls.push(url);
          } else if (fileObj.url) {
            // 既存ファイル
            myNumberFileUrls.push(fileObj.url);
          }
        }
      }
      // ファイルアップロード（基礎年金番号）
      let basicPensionNumberFileUrls: string[] = [];
      if (this.selectedBasicPensionNumberFile && this.selectedBasicPensionNumberFile.length > 0) {
        for (const fileObj of this.selectedBasicPensionNumberFile) {
          if (fileObj.file) {
            // 新規ファイル
            const url = await this.employeeService.uploadFile(fileObj.file, 'basicPensionNumberFile');
            basicPensionNumberFileUrls.push(url);
          } else if (fileObj.url) {
            // 既存ファイル
            basicPensionNumberFileUrls.push(fileObj.url);
          }
        }
      }

      // familyMembersのファイルアップロード（マイナンバー・基礎年金番号）
      const familyMembers = [];
      for (let i = 0; i < this.familyMembersArray.controls.length; i++) {
        const group = this.familyMembersArray.at(i);
        // マイナンバー
        let familyMyNumberFileUrls: string[] = [];
        if (this.familySelectedMyNumberFiles[i] && this.familySelectedMyNumberFiles[i].length > 0) {
          for (const fileObj of this.familySelectedMyNumberFiles[i]) {
            if (fileObj.file) {
              const url = await this.employeeService.uploadFile(fileObj.file, 'familyMyNumberFile');
              familyMyNumberFileUrls.push(url);
            } else if (fileObj.url) {
              familyMyNumberFileUrls.push(fileObj.url);
            }
          }
        }
        // 基礎年金番号
        let familyBasicPensionNumberFileUrls: string[] = [];
        if (this.familySelectedBasicPensionNumberFiles[i] && this.familySelectedBasicPensionNumberFiles[i].length > 0) {
          for (const fileObj of this.familySelectedBasicPensionNumberFiles[i]) {
            if (fileObj.file) {
              const url = await this.employeeService.uploadFile(fileObj.file, 'familyBasicPensionNumberFile');
              familyBasicPensionNumberFileUrls.push(url);
            } else if (fileObj.url) {
              familyBasicPensionNumberFileUrls.push(fileObj.url);
            }
          }
        }
        familyMembers.push({
          ...group.value,
          familyMyNumberFileUrls,
          familyBasicPensionNumberFileUrls
        });
      }

      // Firestore保存用データに登録データをセット
      const basicInfo: BasicInfo = {
        ...this.basicInfoForm.value,
        employeeInfo: {
          ...this.basicInfoForm.value.employeeInfo,
          myNumberFileUrls,
          basicPensionNumberFileUrls,
        },
        familyMembers,
        createdAt: new Date(),
      };
      await this.employeeService.addBasicInfo(basicInfo);
      this.toastr.success('基本情報を更新しました。');
      this.closeMode();

      // マイナンバー削除
      if (this.deletedMyNumberFileUrls && this.deletedMyNumberFileUrls.length > 0) {
        for (const url of this.deletedMyNumberFileUrls) {
          if (url) {
            const path = this.extractStoragePathFromUrl(url);
            if (path) {
              await this.employeeService.deleteFile(path);
            }
          }
        }
        this.deletedMyNumberFileUrls = [];
      }

      // 基礎年金番号削除
      if (this.deletedBasicPensionNumberFileUrls && this.deletedBasicPensionNumberFileUrls.length > 0) {
        for (const url of this.deletedBasicPensionNumberFileUrls) {
          if (url) {
            const path = this.extractStoragePathFromUrl(url);
            if (path) {
              await this.employeeService.deleteFile(path);
            }
          }
        }
        this.deletedBasicPensionNumberFileUrls = [];
      }

      // 家族マイナンバー削除
      if (this.familyDeletedMyNumberFileUrls && this.familyDeletedMyNumberFileUrls.length > 0) {
        for (let i = 0; i < this.familyDeletedMyNumberFileUrls.length; i++) {
          const urlList = this.familyDeletedMyNumberFileUrls[i];
          if (urlList && urlList.length > 0) {
            for (const url of urlList) {
              if (url) {
                const path = this.extractStoragePathFromUrl(url);
                if (path) {
                  await this.employeeService.deleteFile(path);
                }
              }
            }
          }
        }
        this.familyDeletedMyNumberFileUrls = [];
      }

      // 家族基礎年金番号削除
      if (this.familyDeletedBasicPensionNumberFileUrls && this.familyDeletedBasicPensionNumberFileUrls.length > 0) {
        for (let i = 0; i < this.familyDeletedBasicPensionNumberFileUrls.length; i++) {
          const urlList = this.familyDeletedBasicPensionNumberFileUrls[i];
          if (urlList && urlList.length > 0) {
            for (const url of urlList) {
              if (url) {
                const path = this.extractStoragePathFromUrl(url);
                if (path) {
                  await this.employeeService.deleteFile(path);
                }
              }
            }
          }
        }
        this.familyDeletedBasicPensionNumberFileUrls = [];
      }
    } else {
      this.errorMessage = '入力内容に不備があります。必須項目を確認してください。';
      this.toastr.error('入力内容に不備があります。必須項目を確認してください。');
      Object.keys(this.basicInfoForm.controls).forEach(key => {
        const control = this.basicInfoForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  selectBasicInfo(basicInfo: BasicInfo) {
    this.isViewMode = true;
    this.isEditMode = false;
    this.errorMessage = '';
    this.basicInfoForm.disable();
    
    // 2. 家族情報のFormArrayを人数分生成
    const familyArray = this.basicInfoForm.get('familyMembers') as FormArray;
    familyArray.clear(); // 既存をクリア

    if (basicInfo.familyMembers && Array.isArray(basicInfo.familyMembers)) {
      basicInfo.familyMembers.forEach(member => {
        familyArray.push(this.fb.group({
          familySupport: [{ value: member.familySupport, disabled: true }],
          familyDisabilityHandicap: [{ value: member.familyDisabilityHandicap, disabled: true }],
          familyName: [{ value: member.familyName, disabled: true }],
          familyFirstName: [{ value: member.familyFirstName, disabled: true }],
          familyNameKana: [{ value: member.familyNameKana, disabled: true }],
          familyFirstNameKana: [{ value: member.familyFirstNameKana, disabled: true }],
          familyRelationship: [{ value: member.familyRelationship, disabled: true }],
          familyGender: [{ value: member.familyGender, disabled: true }],
          familyLivingTogether: [{ value: member.familyLivingTogether, disabled: true }],
          familyIncome: [{ value: member.familyIncome, disabled: true }],
          familyBirthEra: [{ value: member.familyBirthEra, disabled: true }],
          familyBirthYear: [{ value: member.familyBirthYear, disabled: true }],
          familyBirthMonth: [{ value: member.familyBirthMonth, disabled: true }],
          familyBirthDay: [{ value: member.familyBirthDay, disabled: true }],
          familyPostalCode1: [{ value: member.familyPostalCode1, disabled: true }],
          familyPostalCode2: [{ value: member.familyPostalCode2, disabled: true }],
          familyAddress: [{ value: member.familyAddress, disabled: true }],
          familyAddressKana: [{ value: member.familyAddressKana, disabled: true }],
          familyMyNumber: [{ value: member.familyMyNumber, disabled: true }],
          familyMyNumberFile: [{ value: member.familyMyNumberFile, disabled: true }],
          familyBasicPensionNumber: [{ value: member.familyBasicPensionNumber, disabled: true }],
          familyBasicPensionNumberFile: [{ value: member.familyBasicPensionNumberFile, disabled: true }]
        }));
      });
    }

    // 3. 残りの項目をpatchValue
    this.basicInfoForm.patchValue({
      ...basicInfo,
      familyMembers: undefined // familyMembersはFormArrayで個別にセット済み
    });

    // ファイルURLリストを変数にセット
    this.myNumberFileUrls = basicInfo.employeeInfo.myNumberFileUrls || [];
    this.selectedMyNumberFile = (this.myNumberFileUrls || []).map(url => ({
      url,
      name: this.extractFileName(url)
    }));
    this.basicPensionNumberFileUrls = basicInfo.employeeInfo.basicPensionNumberFileUrls || [];
    this.selectedBasicPensionNumberFile = (this.basicPensionNumberFileUrls || []).map(url => ({
      url,
      name: this.extractFileName(url)
    }));
    this.familySelectedMyNumberFiles = [];
    this.familySelectedBasicPensionNumberFiles = [];
    if (basicInfo.familyMembers && Array.isArray(basicInfo.familyMembers)) {
      basicInfo.familyMembers.forEach((member, i) => {
        const myNumberUrls = member.familyMyNumberFileUrls || [];
        this.familySelectedMyNumberFiles[i] = (myNumberUrls || []).map(url => ({
          url,
          name: this.extractFileName(url)
        }));
        const pensionUrls = member.familyBasicPensionNumberFileUrls || [];
        this.familySelectedBasicPensionNumberFiles[i] = (pensionUrls || []).map(url => ({
          url,
          name: this.extractFileName(url)
        }));
      });
    }
  }

  // ファイル名抽出関数
  extractFileName(url: string): string {
    if (!url) return '';
    // クエリパラメータ前まで取得
    const path = url.split('/').pop()?.split('?')[0] || url;
    // %デコードして、さらにスラッシュで分割して最後だけ取得
    const decoded = decodeURIComponent(path);
    return decoded.split('/').pop() || decoded;
  }

  closeMode() {
    this.isViewMode = false;
    this.isEditMode = false;
    this.basicInfoForm.enable();
    this.basicInfoForm.reset();
    this.familyMembersArray.clear();
    this.errorMessage = '';

    // ファイル選択状態もリセット
    this.selectedMyNumberFile = [];
    this.selectedBasicPensionNumberFile = [];
    this.myNumberFileUrls = [];
    this.basicPensionNumberFileUrls = [];
    this.familySelectedMyNumberFiles = [];
    this.familySelectedBasicPensionNumberFiles = [];
    this.deletedMyNumberFileUrls = [];
    this.deletedBasicPensionNumberFileUrls = [];
    this.familyDeletedMyNumberFileUrls = [];
    this.familyDeletedBasicPensionNumberFileUrls = [];

    // プロフィール情報を再セット
    if (this.employeeProfile) {
      // 氏名
      if (this.employeeProfile.lastName && this.employeeProfile.firstName) {
        this.basicInfoForm.get('employeeInfo.lastName')?.setValue(this.employeeProfile.lastName || '');
        this.basicInfoForm.get('employeeInfo.firstName')?.setValue(this.employeeProfile.firstName || '');
      }
      // 社員属性
      if (this.employeeProfile.employeeAttribute) {
        this.basicInfoForm.get('officeInfo.employeeAttribute')?.setValue(this.employeeProfile.employeeAttribute);
      }
      // 在籍状況
      if (this.employeeProfile.enrolmentData !== undefined) {
        this.basicInfoForm.get('employmentInfo.enrolmentData')?.setValue(this.employeeProfile.enrolmentData);
      }
      // 社員番号
      if (this.employeeProfile.employeeId) {
        this.basicInfoForm.get('officeInfo.employeeNumber')?.setValue(this.employeeProfile.employeeId);
      }
    }
  }

  editMode() {
    this.isViewMode = false;
    this.isEditMode = true;
    this.basicInfoForm.enable();
    this.errorMessage = '';
  }

  get myNumberFileName(): string {
    return this.basicInfoForm.get('employeeInfo.myNumberFileName')?.value || '';
  }

  get basicPensionNumberFileName(): string {
    return this.basicInfoForm.get('employeeInfo.basicPensionNumberFileName')?.value || '';
  }

  get familyMyNumberFileName(): string {
    return this.basicInfoForm.get('familyMyNumberFile')?.value || '';
  }

  get familyBasicPensionNumberFileName(): string {
    return this.basicInfoForm.get('familyBasicPensionNumberFile')?.value || '';
  }

  onMyNumberFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = input.files;
      const fileArray = Array.from(files);
      this.selectedMyNumberFile = fileArray.map(file => ({
        name: file.name,
        file
      }));
      this.basicInfoForm.get('employeeInfo.myNumberFileName')?.setValue(fileArray.map(file => file.name).join(', '));
    } else {
      this.selectedMyNumberFile = null;
      this.basicInfoForm.get('employeeInfo.myNumberFileName')?.setValue('');
    }
  }

  onBasicPensionNumberFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = input.files;
      const fileArray = Array.from(files);
      this.selectedBasicPensionNumberFile = fileArray.map(file => ({
        name: file.name,
        file
      }));
      this.basicInfoForm.get('employeeInfo.basicPensionNumberFileName')?.setValue(fileArray.map(file => file.name).join(', '));
    } else {
      this.selectedBasicPensionNumberFile = null;
      this.basicInfoForm.get('employeeInfo.basicPensionNumberFileName')?.setValue('');
    }
  }

  onFileRemove(fileType: string, fileToRemove: { url?: string; name: string; file?: File }) {
    if (fileType === 'myNumberFile' && this.selectedMyNumberFile) {
      this.selectedMyNumberFile = this.selectedMyNumberFile.filter(file => file.url !== fileToRemove.url);
      this.deletedMyNumberFileUrls.push(fileToRemove.url ?? '');
    } else if (fileType === 'basicPensionNumberFile' && this.selectedBasicPensionNumberFile) {
      this.selectedBasicPensionNumberFile = this.selectedBasicPensionNumberFile.filter(file => file.url !== fileToRemove.url);
      this.deletedBasicPensionNumberFileUrls.push(fileToRemove.url ?? '');
    } else if (fileType === 'familyMyNumberFile') {
      this.basicInfoForm.get('familyMyNumberFile')?.setValue('');
    } else if (fileType === 'familyBasicPensionNumberFile') {
      this.basicInfoForm.get('familyBasicPensionNumberFile')?.setValue('');
    }
  }

  // ダウンロードURLからStorageパスを抽出
  extractStoragePathFromUrl(url: string): string {
    // .../o/ の後ろから ? の前までを取得し、デコード
    const matches = url.match(/\/o\/(.+)\?/);
    if (matches && matches[1]) {
      return decodeURIComponent(matches[1]);
    }
    return '';
  }

  // familyMyNumberFile選択
  onFamilyMyNumberFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileArray = Array.from(input.files);
      this.familySelectedMyNumberFiles[index] = fileArray.map(file => ({
        name: file.name,
        file
      }));
      this.familyMembersArray.at(index).get('familyMyNumberFileName')?.setValue(fileArray.map(f => f.name).join(', '));
    } else {
      this.familySelectedMyNumberFiles[index] = [];
      this.familyMembersArray.at(index).get('familyMyNumberFileName')?.setValue('');
    }
  }

  // familyBasicPensionNumberFile選択
  onFamilyBasicPensionNumberFileSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileArray = Array.from(input.files);
      this.familySelectedBasicPensionNumberFiles[index] = fileArray.map(file => ({
        name: file.name,
        file
      }));
      this.familyMembersArray.at(index).get('familyBasicPensionNumberFileName')?.setValue(fileArray.map(f => f.name).join(', '));
    } else {
      this.familySelectedBasicPensionNumberFiles[index] = [];
      this.familyMembersArray.at(index).get('familyBasicPensionNumberFileName')?.setValue('');
    }
  }

  // familyMyNumberFile削除
  onFamilyFileRemove(type: 'myNumber' | 'basicPension', index: number, file: { url?: string; name: string; file?: File }) {
    if (type === 'myNumber') {
      this.familySelectedMyNumberFiles[index] = this.familySelectedMyNumberFiles[index].filter(f => f.url !== file.url);
      if (!this.familyDeletedMyNumberFileUrls[index]) this.familyDeletedMyNumberFileUrls[index] = [];
      this.familyDeletedMyNumberFileUrls[index].push(file.url ?? '');
    } else {
      this.familySelectedBasicPensionNumberFiles[index] = this.familySelectedBasicPensionNumberFiles[index].filter(f => f.url !== file.url);
      if (!this.familyDeletedBasicPensionNumberFileUrls[index]) this.familyDeletedBasicPensionNumberFileUrls[index] = [];
      this.familyDeletedBasicPensionNumberFileUrls[index].push(file.url ?? '');
    }
  }

}
