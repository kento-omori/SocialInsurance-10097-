export interface BasicInfo {
  // 従業員情報（必須項目）
  employeeInfo: {
    lastName: string;          // 氏（必須）
    firstName: string;         // 名（必須）
    lastNameKana: string;      // 氏カナ（必須）
    firstNameKana: string;     // 名カナ（必須）
    birthEra: string;         // 生年月日（和暦）（必須）
    birthYear: string;        // 生年月日（年）（必須）
    birthMonth: string;       // 生年月日（月）（必須）
    birthDay: string;         // 生年月日（日）（必須）
    gender: string;           // 性別（必須）
    postalCode1: string;      // 郵便番号（前半）（必須）
    postalCode2: string;      // 郵便番号（後半）（必須）
    address: string;          // 住所（必須）
    addressKana: string;      // 住所カナ（必須）
    myNumber: string;         // マイナンバー（必須）
    basicPensionNumber: string; // 基礎年金番号（必須）
    phone?: string;           // 電話番号（任意）
    email?: string;           // メールアドレス（任意）
    myNumberFile?: File;      // マイナンバー書類（任意）
    myNumberFileName?: string; // マイナンバー書類名（任意）
    myNumberFileUrls?: string[]; // マイナンバー書類URL（任意）
    basicPensionNumberFile?: File; // 基礎年金番号書類（任意）
    basicPensionNumberFileName?: string; // 基礎年金番号書類名（任意）
    basicPensionNumberFileUrls?: string[]; // 基礎年金番号書類URL（任意）
  };

  // 入退社情報
  employmentInfo: {
    enrolmentData: boolean;   // 在籍状況（必須）
    hireEra: string;         // 入社日（和暦）（必須）
    hireYear: string;        // 入社日（年）（必須）
    hireMonth: string;       // 入社日（月）（必須）
    hireDay: string;         // 入社日（日）（必須）
    retireEra?: string;      // 退社日（和暦）（任意）
    retireYear?: string;     // 退社日（年）（任意）
    retireMonth?: string;    // 退社日（月）（任意）
    retireDay?: string;      // 退社日（日）（任意）
  };

  // 業務情報
  officeInfo: {
    office: string;          // 所属事業所（必須）
    employeeNumber: string;  // 社員番号（必須）
    employeeAttribute: string; // 社員属性（必須）
    rank?: string;          // 役職（任意）
    department?: string;    // 部署（任意）
  };

  // 通勤手当（任意）
  commuteInfo: {
    commuteSection?: string; // 通勤区間（任意）
    commutePass?: string;   // 定期券代（任意）
  };

  // 家族情報（配列）
  familyMembers: {
    familySupport: string;   // 扶養状況（必須）
    familyDisabilityHandicap: string; // 障碍者手帳の有無（必須）
    familyName: string;      // 氏（必須）
    familyFirstName: string; // 名（必須）
    familyNameKana: string;  // 氏カナ（必須）
    familyFirstNameKana: string; // 名カナ（必須）
    familyRelationship: string; // 続柄（必須）
    familyGender: string;    // 性別（必須）
    familyLivingTogether: string; // 同居の有無（必須）
    familyIncome: string;    // 年収（必須）
    familyBirthEra: string;  // 生年月日（和暦）（必須）
    familyBirthYear: string; // 生年月日（年）（必須）
    familyBirthMonth: string; // 生年月日（月）（必須）
    familyBirthDay: string;  // 生年月日（日）（必須）
    familyPostalCode1: string; // 郵便番号（前半）（必須）
    familyPostalCode2: string; // 郵便番号（後半）（必須）
    familyAddress: string;   // 住所（必須）
    familyAddressKana: string; // 住所カナ（必須）
    familyMyNumber: string;  // マイナンバー（必須）
    familyMyNumberFile?: File; // マイナンバー書類（任意）
    familyMyNumberFileName?: string; // マイナンバー書類名（任意）
    familyMyNumberFileUrls?: string[]; // マイナンバー書類URL（任意）
    familyBasicPensionNumber?: string; // 基礎年金番号（任意）
    familyBasicPensionNumberFile?: File; // 基礎年金番号書類（任意）
    familyBasicPensionNumberFileName?: string; // 基礎年金番号書類名（任意）
    familyBasicPensionNumberFileUrls?: string[]; // 基礎年金番号書類URL（任意）
  }[];
   
  id?: string;     // 基本情報履歴ID（履歴取得時のキー）
  createdAt: Date | string | null; // 作成日時（必須）
}
