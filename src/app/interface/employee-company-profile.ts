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
    employeeName: string; //マスターデータ登録時
    employeeAttribute: string; //マスターデータ登録時
    insuredStatus: string[]; //マスターデータ登録時
    employeeEmail?: string; //アカウント登録時
    enrolmentData: boolean; // 在籍・退職フラグ
    createdAt: Date; //マスターデータ登録時
    updatedAt?: Date; //マスターデータ更新やアカウント登録時
    retiredAt?: Date; // 退職登録時
    roles?: Role[];
}
      
export interface Role {
    type: 'admin' | 'approver';
    createdAt: Date;
    deletedAt?: Date | null;
    isDeleted: boolean;
}

