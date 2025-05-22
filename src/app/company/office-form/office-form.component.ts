import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { Office } from '../office.interface';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { findPrefecture, PrefectureRange } from '../prefecture-data';

@Component({
  selector: 'app-office-form',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, ReactiveFormsModule],
  templateUrl: './office-form.component.html',
  styleUrl: './office-form.component.css'
})
export class OfficeFormComponent implements OnInit, OnChanges {
  @Input() office: Office | null = null;
  @Input() isViewMode: boolean = false;
  @Output() officeAdded = new EventEmitter<Office>();
  @Output() close = new EventEmitter<void>();
  @Output() officeUpdated = new EventEmitter<Office>();
  @Output() officeDeleted = new EventEmitter<Office>();
  step = 1;
  officeForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  officeData = {};
  ownerData = {};
  selectedMonths: number[] = [];
  selectedBonusMonths: number[] = [];
  selectedSalaryTypes: string[] = [];
  otherSalaryType: string = '';
  selectedAllowanceTypes: string[] = [];
  otherAllowanceType: string = '';
  selectedInKindTypes: string[] = [];
  otherInKindType: string = '';

  // 給与形態の個別プロパティ
  isMonthly: boolean = false;
  isDaily: boolean = false;
  isDailyMonthly: boolean = false;
  isCommission: boolean = false;
  isHourly: boolean = false;
  isAnnual: boolean = false;
  isOther: boolean = false;

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.officeForm = this.fb.group({
      officeCode1: ['', [Validators.required, Validators.pattern('^[0-9\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]{1,4}$')]],
      officeCode2: ['', [Validators.required, Validators.pattern('^[0-9\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]{1,4}$')]],
      officeNumber: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      postalCode1: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]],
      postalCode2: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      address: ['', Validators.required],
      addressKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー0-9a-zA-Z\\s-]+$')]],
      officeName: ['', Validators.required],
      officeNameKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー0-9a-zA-Z\\s-]+$')]],
      phone1: ['', [Validators.required, Validators.pattern('^[0-9]{2,4}$')]],
      phone2: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
      phone3: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      ownerLastName: ['', Validators.required],
      ownerFirstName: ['', Validators.required],
      ownerLastKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      ownerFirstKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー]+$')]],
      ownerPostalCode1: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]],
      ownerPostalCode2: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      ownerAddress: ['', Validators.required],
      ownerAddressKana: ['', [Validators.required, Validators.pattern('^[ァ-ヶー0-9a-zA-Z\\s-]+$')]],
      contactName: ['', Validators.required],
      contactPhone: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      industryType: ['', [Validators.required, Validators.pattern('^[0-9]{2}$')]],
      businessType: ['', Validators.required],
      typeSelect: ['', Validators.required],
      businessNumberSelect: ['', Validators.required],
      businessNumber: ['', [Validators.required, Validators.pattern('^[0-9]{12,13}$')]],
      branchSelect: ['', Validators.required],
      foreignSelect: ['', Validators.required],
      bulkApprovalType: [''],
      closingDate: ['', [Validators.required, Validators.pattern('^[1-9]|[12][0-9]|3[01]$')]],
      paydayMonth: ['', Validators.required],
      paydayDate: ['', [Validators.required, Validators.pattern('^[1-9]|[12][0-9]|3[01]$')]],
      monthlyLaborDays: ['', [Validators.required, Validators.pattern('^[1-9]|[12][0-9]|3[01]$')]],
      weeklyLaborHours: ['', [Validators.required, Validators.pattern('^[0-9]|1[0-9]|2[0-4]$')]],
      weeklyLaborMinutes: ['', [Validators.required, Validators.pattern('^[0-9]|[1-5][0-9]$')]],
      selectedMonths: [[]],
      selectedBonusMonths: [[]],
      salaryTypes: this.fb.array([], Validators.required),
      otherSalaryType: [''],
      allowanceTypes: this.fb.array([]),
      otherAllowanceType: [''],
      inKindTypes: this.fb.array([]),
      otherInKindType: ['']
    });

    // 支店選択時のみ一括適用承認の有無を必須にする
    this.officeForm.get('branchSelect')?.valueChanges.subscribe(value => {
      const bulkApprovalTypeControl = this.officeForm.get('bulkApprovalType');
      if (value === '支店') {
        bulkApprovalTypeControl?.setValidators([Validators.required]);
      } else {
        bulkApprovalTypeControl?.clearValidators();
        bulkApprovalTypeControl?.setValue('');
      }
      bulkApprovalTypeControl?.updateValueAndValidity();
    });

    // 昇格月と賞与月の選択制限（4つまで）
    this.officeForm.get('selectedMonths')?.valueChanges.subscribe(value => {
      if (value && value.length > 4) {
        const newValue = value.slice(0, 4);
        this.officeForm.get('selectedMonths')?.setValue(newValue);
      }
    });

    this.officeForm.get('selectedBonusMonths')?.valueChanges.subscribe(value => {
      if (value && value.length > 4) {
        const newValue = value.slice(0, 4);
        this.officeForm.get('selectedBonusMonths')?.setValue(newValue);
      }
    });

    // 郵便番号の変更を監視
    this.officeForm.get('postalCode1')?.valueChanges.subscribe(() => this.updatePrefecture());
    this.officeForm.get('postalCode2')?.valueChanges.subscribe(() => this.updatePrefecture());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['office'] && this.officeForm) {
      this.officeForm.reset();
      
      if (this.office) {
        // 基本情報の設定
        this.officeForm.patchValue(this.office);

        // チェックボックスの状態を設定
        if (this.office.salaryTypes) {
          this.salaryTypesArray.clear();
          this.selectedSalaryTypes = [...this.office.salaryTypes];
          this.office.salaryTypes.forEach(type => {
            const control = this.fb.control(type);
            if (this.isViewMode) {
              control.disable();
            }
            this.salaryTypesArray.push(control);
          });
        }

        if (this.office.allowanceTypes) {
          this.allowanceTypesArray.clear();
          this.selectedAllowanceTypes = [...this.office.allowanceTypes];
          this.office.allowanceTypes.forEach(type => {
            const control = this.fb.control(type);
            if (this.isViewMode) {
              control.disable();
            }
            this.allowanceTypesArray.push(control);
          });
        }

        if (this.office.inKindTypes) {
          this.inKindTypesArray.clear();
          this.selectedInKindTypes = [...this.office.inKindTypes];
          this.office.inKindTypes.forEach(type => {
            const control = this.fb.control(type);
            if (this.isViewMode) {
              control.disable();
            }
            this.inKindTypesArray.push(control);
          });
        }

        // その他の入力値を設定
        if (this.office.salaryTypesOther) {
          this.otherSalaryType = this.office.salaryTypesOther;
          this.officeForm.patchValue({ otherSalaryType: this.office.salaryTypesOther });
        }
        if (this.office.allowanceTypesOther) {
          this.otherAllowanceType = this.office.allowanceTypesOther;
          this.officeForm.patchValue({ otherAllowanceType: this.office.allowanceTypesOther });
        }
        if (this.office.inKindTypesOther) {
          this.otherInKindType = this.office.inKindTypesOther;
          this.officeForm.patchValue({ otherInKindType: this.office.inKindTypesOther });
        }
      }

      // 表示モードに応じてフォームの有効/無効を切り替え
      if (this.isViewMode) {
        this.officeForm.disable();
      } else {
        this.officeForm.enable();
      }
    }
  }

  ngOnInit(): void {
    if (this.office) {
      this.officeForm.patchValue(this.office);
      if (this.isViewMode) {
        this.officeForm.disable();
      }
    }
  }

  get salaryTypesArray() {
    return this.officeForm.get('salaryTypes') as FormArray;
  }

  get allowanceTypesArray() {
    return this.officeForm.get('allowanceTypes') as FormArray;
  }

  get inKindTypesArray() {
    return this.officeForm.get('inKindTypes') as FormArray;
  }

  onCheckboxChange(event: any, type: string) {
    const formArray = this.officeForm.get(type) as FormArray;
    const value = event.target.value;
    const checked = event.target.checked;

    if (checked) {
      if (!formArray.value.includes(value)) {
        formArray.push(this.fb.control(value));
      }
    } else {
      const index = formArray.value.indexOf(value);
      if (index > -1) {
        formArray.removeAt(index);
      }
    }
  }

  isChecked(type: string, value: string): boolean {
    const formArray = this.officeForm.get(type) as FormArray;
    return formArray.value.includes(value);
  }

  // チェックボックスの変更を監視
  onSalaryTypeChange() {
    if (this.isViewMode) return;
    
    this.selectedSalaryTypes = [];
    if (this.isMonthly) this.selectedSalaryTypes.push('monthly');
    if (this.isDaily) this.selectedSalaryTypes.push('daily');
    if (this.isDailyMonthly) this.selectedSalaryTypes.push('daily_monthly');
    if (this.isCommission) this.selectedSalaryTypes.push('commission');
    if (this.isHourly) this.selectedSalaryTypes.push('hourly');
    if (this.isAnnual) this.selectedSalaryTypes.push('annual');
    if (this.isOther) this.selectedSalaryTypes.push('other');
  }

  updateSalaryTypes(type: string, checked: boolean) {
    if (this.isViewMode) return;
    
    if (checked) {
      if (!this.selectedSalaryTypes.includes(type)) {
        this.selectedSalaryTypes.push(type);
      }
    } else {
      const index = this.selectedSalaryTypes.indexOf(type);
      if (index > -1) {
        this.selectedSalaryTypes.splice(index, 1);
        if (type === 'other') {
          this.otherSalaryType = '';
          this.selectedSalaryTypes = this.selectedSalaryTypes.filter(item => !item.startsWith('other:'));
        }
      }
    }
  }

  onOtherSalaryTypeChange(value: string) {
    this.otherSalaryType = value;
    const otherIndex = this.selectedSalaryTypes.findIndex(item => item.startsWith('other:'));
    if (otherIndex > -1) {
      this.selectedSalaryTypes[otherIndex] = `other:${value}`;
    } else if (value) {
      this.selectedSalaryTypes.push(`other:${value}`);
    }
  }

  updateAllowanceTypes(type: string, checked: boolean) {
    if (this.isViewMode) return;
    
    if (checked) {
      if (!this.selectedAllowanceTypes.includes(type)) {
        this.selectedAllowanceTypes.push(type);
      }
    } else {
      const index = this.selectedAllowanceTypes.indexOf(type);
      if (index > -1) {
        this.selectedAllowanceTypes.splice(index, 1);
        if (type === 'other') {
          this.otherAllowanceType = '';
          this.selectedAllowanceTypes = this.selectedAllowanceTypes.filter(item => !item.startsWith('other:'));
        }
      }
    }
  }

  onOtherAllowanceTypeChange(value: string) {
    this.otherAllowanceType = value;
    const otherIndex = this.selectedAllowanceTypes.findIndex(item => item.startsWith('other:'));
    if (otherIndex > -1) {
      this.selectedAllowanceTypes[otherIndex] = `other:${value}`;
    } else if (value) {
      this.selectedAllowanceTypes.push(`other:${value}`);
    }
  }

  updateInKindTypes(type: string, checked: boolean) {
    if (this.isViewMode) return;
    
    if (checked) {
      if (!this.selectedInKindTypes.includes(type)) {
        this.selectedInKindTypes.push(type);
      }
    } else {
      const index = this.selectedInKindTypes.indexOf(type);
      if (index > -1) {
        this.selectedInKindTypes.splice(index, 1);
        if (type === 'other') {
          this.otherInKindType = '';
          this.selectedInKindTypes = this.selectedInKindTypes.filter(item => !item.startsWith('other:'));
        }
      }
    }
  }

  onOtherInKindTypeChange(value: string) {
    this.otherInKindType = value;
    const otherIndex = this.selectedInKindTypes.findIndex(item => item.startsWith('other:'));
    if (otherIndex > -1) {
      this.selectedInKindTypes[otherIndex] = `other:${value}`;
    } else if (value) {
      this.selectedInKindTypes.push(`other:${value}`);
    }
  }

  async onEdit(): Promise<void> {
    if (this.office) {
      this.isViewMode = false;
      this.officeForm.enable();
      this.officeForm.patchValue(this.office);
      
      // チェックボックスの状態を設定
      if (this.office.salaryTypes) {
        this.salaryTypesArray.clear();
        this.office.salaryTypes.forEach(type => {
          this.salaryTypesArray.push(this.fb.control(type));
        });
      }
      
      if (this.office.allowanceTypes) {
        this.allowanceTypesArray.clear();
        this.office.allowanceTypes.forEach(type => {
          this.allowanceTypesArray.push(this.fb.control(type));
        });
      }
      
      if (this.office.inKindTypes) {
        this.inKindTypesArray.clear();
        this.office.inKindTypes.forEach(type => {
          this.inKindTypesArray.push(this.fb.control(type));
        });
      }
    }
  }

  async onDelete(): Promise<void> {
    if (this.office && confirm('この事業所を削除してもよろしいですか？')) {
      try {
        await this.companyService.deleteOffice(this.office.id!);
        this.toastr.success('事業所を削除しました。');
        this.officeDeleted.emit(this.office);
        this.close.emit();
      } catch (error) {
        this.toastr.error('事業所の削除に失敗しました。');
        console.error('事業所の削除に失敗しました:', error);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.officeForm.valid) {
      try {
        this.isSubmitting = true;
        this.errorMessage = '';

        const formValue = this.officeForm.value;
        const postalCode = parseInt(formValue.postalCode1 + formValue.postalCode2);
        const prefecture = findPrefecture(postalCode);

        const officeData: Office = {
          ...formValue,
          prefecture,  // 都道府県情報を追加
          salaryTypes: this.salaryTypesArray.value,
          allowanceTypes: this.allowanceTypesArray.value,
          inKindTypes: this.inKindTypesArray.value,
          updatedAt: new Date()
        };

        if (this.office?.id) {
          // 編集の場合
          await this.companyService.updateOffice(this.office.id, officeData);
          this.toastr.success('事業所情報を更新しました。');
          this.officeUpdated.emit({...officeData, id: this.office.id});
        } else {
          // 新規登録の場合
          await this.companyService.addOffice(officeData);
          this.toastr.success('事業所情報を保存しました。');
          this.officeAdded.emit(officeData);
        }
        this.close.emit();
      } catch (error) {
        this.toastr.error('事業所情報の保存に失敗しました。');
        console.error('事業所情報の保存に失敗しました:', error);
        this.errorMessage = '事業所情報の保存に失敗しました。もう一度お試しください。';
      } finally {
        this.isSubmitting = false;
      }
    } else {
      // フォームが無効な場合、各フィールドのバリデーションを表示
      Object.keys(this.officeForm.controls).forEach(key => {
        const control = this.officeForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  // 郵便番号から都道府県を特定するメソッド
  private updatePrefecture(): void {
    const postalCode1 = this.officeForm.get('postalCode1')?.value;
    const postalCode2 = this.officeForm.get('postalCode2')?.value;

    if (postalCode1 && postalCode2 && postalCode1.length === 3 && postalCode2.length === 4) {
      // 郵便番号の上2桁を取得
      const prefix = postalCode1.substring(0, 2);
      const prefecture = findPrefecture(prefix);
      if (prefecture) {
        this.officeForm.patchValue({ prefecture });
      }
    }
  }
}