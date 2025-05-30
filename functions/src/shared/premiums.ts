export interface Premiums {
    id?: number;
    companyId: string;
    companyName: string;
    employeeId: string;
    employeeName: string;
    birthDate: string;
    age: number;
    qualification: string;   
    standardRemuneration: number;      
    standardRemunerationGrade?: number; // 標準報酬賞与額にはない
    standardRemunerationDate: string;
    healthInsurancePremium: number | null; // 健康保険料（従業員負担分・端数処理なし）
    nursingCarePremium: number | null; // 介護保険料（従業員負担分・端数処理なし）
    pensionInsurancePremium: number | null; // 厚生年金保険料（従業員負担分・端数処理なし）
    employeeShare: number | null; // 被保険者負担分総額（端数処理なし）
    healthInsurancePremiumCompany: number | null; // 健康保険料（事業主負担分・端数処理なし）
    nursingCarePremiumCompany: number | null; // 介護保険料（事業主負担分・端数処理なし）
    pensionInsurancePremiumCompany: number | null; // 厚生年金保険料（事業主負担分・端数処理なし）
    childRearingContribution: number | null; // 子ども子育て拠出金（事業主負担分・端数処理なし）
    companyShare: number | null; // 事業主負担分総額（端数処理なし）
    totalPremium: number | null; // 総額（端数処理なし）

    display_healthInsurancePremium: number | null; // 健康保険料（従業員負担分・端数処理あり・表示用）
    display_nursingCarePremium: number | null; // 介護保険料（従業員負担分・端数処理あり・表示用）
    display_pensionInsurancePremium: number | null; // 厚生年金保険料（従業員負担分・端数処理あり・表示用）
    display_employeeShare: number | null; // 被保険者負担分総額（端数処理あり・表示用）
    display_healthInsurancePremiumCompany: number | null; // 健康保険料（事業主負担分・端数処理あり・表示用）
    display_nursingCarePremiumCompany: number | null; // 介護保険料（事業主負担分・端数処理あり・表示用）
    display_pensionInsurancePremiumCompany: number | null; // 厚生年金保険料（事業主負担分・端数処理あり・表示用）
    display_childRearingContribution: number | null; // 子ども子育て拠出金（事業主負担分・端数処理あり・表示用）
    display_companyShare: number | null; // 事業主負担分総額（端数処理あり・表示用）
    display_totalPremium: number | null; // 総額（端数処理あり・表示用）

    paymentDate?: string;               // 支給年月（例: 2024-07）→給与情報から取得
    salaryType?: string;                // 給与種類（給与/賞与など）→給与情報から取得
    createdAt: Date;
    updatedAt: Date;
}

export interface totalPremium {
    companyId?: string;
    totalHealthInsurance: number;
    totalNursingCare: number;
    totalPension: number;
    totalEmployeeShare: number;
    totalHealthInsuranceCompany: number;
    totalNursingCareCompany: number;
    totalPensionCompany: number;
    totalChildRearing: number;
    totalCompanyShare: number;
    totalHealthAll: number;
    totalNursingCareAll: number;
    totalPensionAll: number;
    totalChildRearingAll: number;
    totalAll: number;
    paymentDate: string;    // 支給年月
    salaryType: string;     // 給与種類
    createdAt: Date;
    updatedAt: Date;
}
