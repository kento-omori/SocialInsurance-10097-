export interface StandardRemuneration {
    id?: string;                       // ドキュメントID（新規登録）
    companyId: string;                 // 会社ID（ルートパラメータから取得）
    companyName?: string;               // 会社名（会社IDから取得）
    employeeId: string;                // 社員番号（キー）
    employeeName: string;              // 従業員氏名（キーから取得）
    employeeAttribute: string;         // 社員属性（キーから取得）
    qualification: string;             // 資格情報（キーから取得）
    salaryType: string;                // 給与種類（キーから取得）
    standardRemuneration: number;      // 標準報酬月額（新規登録）
    standardRemunerationGrade?: number; // 等級（新規登録）・標準賞与額にはない
    standardRemunerationDate: string;  // 適用年月（新規登録）
    createdAt: Date;                  // 作成日時（新規登録）
    updatedAt?: Date;                  // 更新日時（新規登録）
}
