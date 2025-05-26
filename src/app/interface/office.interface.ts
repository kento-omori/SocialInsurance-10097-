export interface Office {
  id?: string; // FirestoreのドキュメントID

  prefecture: string; // 都道府県(郵便番号から取得)(協会けんぽの保険料率判定のため)

  // 事業所情報
  officeCode1: string;
  officeCode2: string;
  officeNumber: string;
  postalCode1: string;
  postalCode2: string;
  address: string;
  addressKana: string;
  officeName: string;
  officeNameKana: string;
  phone1: string;
  phone2: string;
  phone3: string;
  officeType: string;
  bulkApprovalType?: string;  // 支店の場合のみ使用

  // 代表者情報
  ownerLastName: string;
  ownerFirstName: string;
  ownerLastNameKana: string;
  ownerFirstNameKana: string;
  ownerPostalCode1: string;
  ownerPostalCode2: string;
  ownerAddress: string;
  ownerAddressKana: string;
  contactName: string;
  contactPhone: string;

  // 法人情報
  industryType: string;
  businessType: string;
  businessTypeOther?: string;
  businessDescription: string;
  businessDescriptionOther?: string;
  typeSelect: string;
  businessNumberSelect: string;
  businessNumber: string;
  branchSelect: string;
  foreignSelect: string;

  // 給与関係
  closingDate: string;
  paydayMonth: string;
  paydayDay: string;
  monthlyLaborDays: string;
  weeklyLaborHours: string;
  weeklyLaborMinutes: string;
  selectedMonths: number[];
  selectedBonusMonths: number[];
  salaryTypes: string[];
  salaryTypesOther?: string;
  otherSalaryType?: string;
  allowanceTypes: string[];
  allowanceTypesOther?: string;
  otherAllowanceType?: string;
  inKindTypes: string[];
  inKindTypesOther?: string;
  otherInKindType?: string;

  // メタデータ
  createdAt: Date;
  updatedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
} 