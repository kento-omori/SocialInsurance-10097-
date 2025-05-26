export interface StandardRemuneration {
    id?: string;                       // ドキュメントID
    companyId: string;                 // 会社ID（これは、ルートパラメータから取得）
    companyName: string;               // 会社名（これは、ルートパラメータから取得）
    employeeId: string;                // 社員番号
    employeeName: string;              // 従業員氏名
    employeeAttribute: string;         // 社員属性
    qualification: string;             // 資格情報
    standardRemuneration: number;      // 標準報酬月額
    standardRemunerationGrade: string;  // 等級
    standardRemunerationDate: string;  // 適用年月
    healthInsuranceRate: number;       // 健康保険料率
    careInsuranceRate: number;         // 介護保険料率
    pensionInsuranceRate: number;      // 厚生年金保険料率
    childEducationRate: number;        // 子ども・子育て拠出金率
}
