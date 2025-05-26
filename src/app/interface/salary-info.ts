export interface SalaryInfo {
  id?: string;                       // ドキュメントID
  companyId: string;                 // 会社ID（これは、ルートパラメータから取得）
  companyName: string;               // 会社名（これは、ルートパラメータから取得）
  employeeId: string;                // 社員番号
  employeeName: string;              // 従業員氏名
  employeeAttribute: string;         // 社員属性
  qualification: string;             // 資格情報
  paymentDate: string;               // 支給年月（例: 2024-07）
  paymentDays: number;               // 支払基礎日数
  salaryType: string;                // 給与種類（給与/賞与など）
  fixedSalaryChange: string;         // 昇給等情報
  nonFixedSalaryChange: string;      // 非固定賃金変更
  currencyAmount: number;            // 支給額(通貨)
  nonCurrencyAmount: number;         // 支給額(現物)
  socialInsuranceTotalAmount: number; // 社会保険算定対象総額
  nonSocialInsuranceAmount: number;  // 社会保険非対象額
  totalAmount: number;               // 支給総額

  createdAt: Date;              // 作成日時
  updatedAt?: Date;              // 更新日時
}
