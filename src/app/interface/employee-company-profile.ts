export interface CompanyProfile {
    companyId: string;
    companyName: string;
    companyEmail: string;
    createdAt: Date;
}
      
export interface EmployeeProfile {
    userId?: string; //アカウント登録時
    companyId: string;  //マスターデータ登録時
    companyName: string; //マスターデータ登録時
    employeeId: string; //マスターデータ登録時
    firstName: string; //マスターデータ登録時
    lastName: string; //マスターデータ登録時
    firstNameKana: string; //マスターデータ登録時
    lastNameKana: string; //マスターデータ登録時
    birthEra: string; //マスターデータ登録時
    birthYear: string; //マスターデータ登録時
    birthMonth: string; //マスターデータ登録時
    birthDay: string; //マスターデータ登録時
    gender: string; //マスターデータ登録時
    employeeAttribute: string; //マスターデータ登録時
    insuredStatus: string[]; //マスターデータ登録時
    office: string; //マスターデータ登録時
    officeName: string; //マスターデータ登録時（事業所情報から取得）
    prefecture?: string; //マスターデータ登録時（事業所情報から取得）
    bulkApprovalType?: string; //マスターデータ登録時（事業所情報から取得。事業所が支店である場合入力される）
    rank: string; //マスターデータ登録時
    department: string; //マスターデータ登録時
    hireEra: string; //マスターデータ登録時
    hireYear: string; //マスターデータ登録時
    hireMonth: string; //マスターデータ登録時
    hireDay: string; //マスターデータ登録時
    retireEra?: string; //マスターデータ登録時
    retireYear?: string; //マスターデータ登録時
    retireMonth?: string; //マスターデータ登録時
    retireDay?: string; //マスターデータ登録時
    employeeEmail?: string; //アカウント登録時
    enrolmentData: boolean; // 在籍・退職フラグ
    createdAt: Date; //マスターデータ登録時
    updatedAt?: Date; //マスターデータ更新やアカウント登録時
    retiredAt?: Date; // 退職登録時
    roles?: Role[]; // 権限付与時登録
}
      
export interface Role {
    type: 'admin' | 'approver';
    createdAt: Date;
    deletedAt?: Date | null;
    isDeleted: boolean;
}