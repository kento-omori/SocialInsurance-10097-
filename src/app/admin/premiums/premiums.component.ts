import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouteParamService } from '../../services/route-param.service';
import { ActivatedRoute } from '@angular/router';
import { InsuranceData, GradeEntry, PrefectureRate} from '../../services/insurance-data.service';
import { StandardRemunerationService } from '../../services/standard-remuneration.service';
import { JpyPipe } from '../view-salary/view-salary.component';
import { EmployeeProfile } from '../../interface/employee-company-profile';
import { Office } from '../../interface/office.interface';
import { UserService } from '../../services/user.service';
import { CompanyService } from '../../services/company.service';
import { Premiums, totalPremium } from '../../interface/premiums';
import { StandardRemuneration } from '../../interface/standard-remuneration';
import { InsurancePremiumionService } from '../../services/insurance-premiumion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-premiums',
  standalone: true,
  imports: [CommonModule, JpyPipe, FormsModule],
  templateUrl: './premiums.component.html',
  styleUrl: './premiums.component.css'
})
export class PremiumsComponent implements OnInit, OnDestroy {
  private companyId: string | null = null;
  private employeeId: string | null = null;
  prefectures: string[] = [];
  gradeTable: GradeEntry[] = [];
  prefectureRates: PrefectureRate[] = [];
  selectedPrefecture: string = '';
  errorMessage: string = '';
  premiumsList: Premiums[] = [];
  standardRemunerations: StandardRemuneration[] = [];
  totalPremium: totalPremium[]  = []
  isLoading: boolean = false;

  // 合計値のプロパティ
  totalHealthInsurance: number = 0;
  totalNursingCare: number = 0;
  totalPension: number = 0;
  totalEmployeeShare: number = 0;
  totalHealthInsuranceCompany: number = 0;
  totalNursingCareCompany: number = 0;
  totalPensionCompany: number = 0;
  totalChildRearing: number = 0;
  totalCompanyShare: number = 0;
  totalHealthAll: number = 0;
  totalNursingCareAll: number = 0;
  totalPensionAll: number = 0;
  totalChildRearingAll: number = 0;
  totalAll: number = 0;

  // 検索条件
  selectedPaymentDate: string = '';
  selectedSalaryType: string = '';  // デフォルト値を設定

  private subscription: Subscription = new Subscription();

  constructor(
    private standardRemunerationService: StandardRemunerationService,
    private routeParamService: RouteParamService,
    private route: ActivatedRoute,
    private userService: UserService,
    private companyService: CompanyService,
    private insurancePremiumionService: InsurancePremiumionService
  ) { }

  // ルーティング
  goToAllEmployeeList() {
    this.routeParamService.goToAllEmployeeList();
  }
  goToAdminHome() {
    this.routeParamService.goToAdminHome();
  }

  // 初期化
  async ngOnInit(): Promise<void> {
    this.companyId = this.routeParamService.setCompanyId(this.route);
    this.employeeId = this.routeParamService.setEmployeeId(this.route);
    
    if (this.companyId) {
      this.companyService.setCompanyId(this.companyId);
      
      // 現在の月を設定
      const now = new Date();
      this.selectedPaymentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.selectedSalaryType = '月額';
    }
    
    this.gradeTable = InsuranceData.getGradeTable();
    this.prefectureRates = InsuranceData.getPrefectureRates();
    this.prefectures = this.prefectureRates.map(rate => rate.name);

    if (this.prefectures.length > 0) {
      this.selectedPrefecture = this.prefectures[0];
    }

    // 保険料計算のトリガーを監視
    this.subscription.add(
      this.insurancePremiumionService.premiumCalculationTrigger$.subscribe(calculations => {
        if (calculations && calculations.length > 0 && calculations[0].companyId === this.companyId) {
          this.selectedPaymentDate = calculations[0].paymentDate;
          this.selectedSalaryType = calculations[0].salaryType;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async loadData() {
    this.isLoading = true;

    if (!this.companyId || !this.selectedPaymentDate || !this.selectedSalaryType) {
      console.error('必要な情報が不足しています');
      return;
    }

    // 選択された支給年月と給与種類のデータの有無をチェック
    const salaryTypes = this.selectedSalaryType === 'すべて' ? ['月額', '賞与'] : [this.selectedSalaryType];
    let hasData = false;
    let hasSalaryData = false;
    console.log('salaryTypes:', salaryTypes);

    // 給与登録情報の有無をチェック
    const employees: EmployeeProfile[] = await this.userService.getEmployees(this.companyId);
    for (const emp of employees) {
      for (const salaryType of salaryTypes) {
        // 月額の場合は給与に変換
        const convertedSalaryType = salaryType === '月額' ? '給与' : salaryType;
        console.log('給与種類:', convertedSalaryType, '支給年月:', this.selectedPaymentDate);
        const salaryUpdateTime = await this.insurancePremiumionService.getLatestSalaryUpdateTime(
          this.companyId,
          emp.employeeId,
          this.selectedPaymentDate,
          convertedSalaryType
        );
        console.log('給与更新日時:', salaryUpdateTime);
        if (salaryUpdateTime) {
          hasSalaryData = true;
          break;
        }
      }
      if (hasSalaryData) break;
    }

    if (!hasSalaryData) {
      console.log('選択された支給年月と給与種類の給与登録情報がありません');
      this.premiumsList = [];
      this.calculateTotals();
      return;
    }


    try {
      // 給与種類が'all'の場合は、給与と賞与の両方を処理
      this.premiumsList = [];

      for (const salaryType of salaryTypes) {
        // 全従業員の給与情報と保険料情報の最終更新日時を取得
        let needsRecalculation = false;

        for (const emp of employees) {
          const [salaryUpdateTime, premiumUpdateTime] = await Promise.all([
            this.insurancePremiumionService.getLatestSalaryUpdateTime(
              this.companyId,
              emp.employeeId,
              this.selectedPaymentDate,
              salaryType
            ),
            this.insurancePremiumionService.getLatestPremiumUpdateTime(
              this.companyId,
              emp.employeeId,
              this.selectedPaymentDate,
              salaryType
            )
          ]);

          // 1人でも更新が必要な場合は再計算
          if (!premiumUpdateTime || 
              (salaryUpdateTime && premiumUpdateTime && salaryUpdateTime > premiumUpdateTime)) {
            needsRecalculation = true;
            break;
          }
        }

        if (!needsRecalculation) {
          // 計算済みの保険料情報を取得
          const calculatedPremiums = await this.insurancePremiumionService.getCalculatedPremiums(
            this.companyId,
            this.selectedPaymentDate,
            salaryType
          );

          if (calculatedPremiums.length > 0) {
            this.premiumsList = [...this.premiumsList, ...calculatedPremiums];
            continue;
          }
        }

        // 新規計算または再計算
        const offices: Office[] = await this.companyService.getOffices();

        // 並列処理で保険料を計算
        const premiumPromises = employees.map(emp => this.calcPremiums(emp, offices));
        const calculatedPremiums = await Promise.all(premiumPromises);
        
        // nullを除外して結果を追加
        this.premiumsList.push(...calculatedPremiums.filter((premium): premium is Premiums => premium !== null));

        // 計算結果を保存（並列処理）
        const savePromises = calculatedPremiums
          .filter((premium): premium is Premiums => premium !== null)
          .map(premium => this.insurancePremiumionService.savePremiumInfo(
            this.companyId!,
            premium.employeeId,
            premium
          ));
        await Promise.all(savePromises);
      }

      // 合計値の計算
      this.calculateTotals();

      // 会社納付額を保存（給与種類ごとに）
      for (const salaryType of salaryTypes) {
        // 既存の合計値を取得
        const existingTotalPremiums = await this.insurancePremiumionService.getCalculatedTotalPremiums(
          this.companyId,
          this.selectedPaymentDate,
          salaryType
        );

        const newTotalPremiums: totalPremium = {
          paymentDate: this.selectedPaymentDate,
          salaryType: salaryType,
          totalHealthInsurance: this.totalHealthInsurance,
          totalNursingCare: this.totalNursingCare,
          totalPension: this.totalPension,
          totalEmployeeShare: this.totalEmployeeShare,
          totalHealthInsuranceCompany: this.totalHealthInsuranceCompany,
          totalNursingCareCompany: this.totalNursingCareCompany,
          totalPensionCompany: this.totalPensionCompany,
          totalChildRearing: this.totalChildRearing,
          totalCompanyShare: this.totalCompanyShare,
          totalHealthAll: this.totalHealthAll,
          totalNursingCareAll: this.totalNursingCareAll,
          totalPensionAll: this.totalPensionAll,
          totalChildRearingAll: this.totalChildRearingAll,
          totalAll: this.totalAll,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // 既存の合計値と比較して、変更がある場合のみ保存
        if (!existingTotalPremiums || 
            existingTotalPremiums.totalHealthInsurance !== newTotalPremiums.totalHealthInsurance ||
            existingTotalPremiums.totalNursingCare !== newTotalPremiums.totalNursingCare ||
            existingTotalPremiums.totalPension !== newTotalPremiums.totalPension ||
            existingTotalPremiums.totalEmployeeShare !== newTotalPremiums.totalEmployeeShare ||
            existingTotalPremiums.totalHealthInsuranceCompany !== newTotalPremiums.totalHealthInsuranceCompany ||
            existingTotalPremiums.totalNursingCareCompany !== newTotalPremiums.totalNursingCareCompany ||
            existingTotalPremiums.totalPensionCompany !== newTotalPremiums.totalPensionCompany ||
            existingTotalPremiums.totalChildRearing !== newTotalPremiums.totalChildRearing ||
            existingTotalPremiums.totalCompanyShare !== newTotalPremiums.totalCompanyShare ||
            existingTotalPremiums.totalHealthAll !== newTotalPremiums.totalHealthAll ||
            existingTotalPremiums.totalNursingCareAll !== newTotalPremiums.totalNursingCareAll ||
            existingTotalPremiums.totalPensionAll !== newTotalPremiums.totalPensionAll ||
            existingTotalPremiums.totalChildRearingAll !== newTotalPremiums.totalChildRearingAll ||
            existingTotalPremiums.totalAll !== newTotalPremiums.totalAll) {
          await this.insurancePremiumionService.saveTotalPremiums(this.companyId, newTotalPremiums);
        }
      }

    } catch (error) {
      console.error('データの読み込みに失敗:', error);
      this.isLoading = false;
    }
  }

  // 合計値を計算するメソッド
  private calculateTotals() {
    this.totalHealthInsurance = 0;
    this.totalNursingCare = 0;
    this.totalPension = 0;
    this.totalEmployeeShare = 0;
    this.totalHealthInsuranceCompany = 0;
    this.totalNursingCareCompany = 0;
    this.totalPensionCompany = 0;
    this.totalChildRearing = 0;
    this.totalCompanyShare = 0;
    this.totalHealthAll = 0;
    this.totalNursingCareAll = 0;
    this.totalPensionAll = 0;
    this.totalChildRearingAll = 0;
    this.totalAll = 0;

    for (const p of this.premiumsList) {
      // 従業員（健保）
      if (p.display_healthInsurancePremium !== null) {
        this.totalHealthInsurance += p.display_healthInsurancePremium;
      }
      // 従業員（介護）
      if (p.display_nursingCarePremium !== null) {
        this.totalNursingCare += p.display_nursingCarePremium;
      }
      // 従業員（厚生）
      if (p.display_pensionInsurancePremium !== null) {
        this.totalPension += p.display_pensionInsurancePremium;
      }
      // 従業員（合計）
      this.totalEmployeeShare = this.totalHealthInsurance + this.totalNursingCare + this.totalPension;

      // 会社負担（合計額）
      if (p.healthInsurancePremium !== null) {
        this.totalHealthAll += p.healthInsurancePremium! + p.healthInsurancePremiumCompany!;
      }else{
        this.totalHealthAll += 0;
      }
      if (p.nursingCarePremium !== null) {
        this.totalNursingCareAll += p.nursingCarePremium! + p.nursingCarePremiumCompany!;
      }else{
        this.totalNursingCareAll += 0;
      }
      if (p.pensionInsurancePremium !== null) {
        this.totalPensionAll += p.pensionInsurancePremium! + p.pensionInsurancePremiumCompany!;
      }else{
        this.totalPensionAll += 0;
      }
      if (p.childRearingContribution !== null) {
        this.totalChildRearingAll += p.childRearingContribution!;
      }else{
        this.totalChildRearingAll += 0;
      }
      this.totalAll = Math.floor(this.totalHealthAll) + Math.floor(this.totalNursingCareAll) + Math.floor(this.totalPensionAll) + Math.floor(this.totalChildRearingAll);

      // 会社負担（健保）
      this.totalHealthInsuranceCompany =  Math.floor(this.totalHealthAll) - this.totalHealthInsurance;
      // 会社負担（介護）
      this.totalNursingCareCompany =  Math.floor(this.totalNursingCareAll) - this.totalNursingCare;
      // 会社負担（厚生）
      this.totalPensionCompany =  Math.floor(this.totalPensionAll) - this.totalPension;
      // 会社負担（子育て）
      this.totalChildRearing =  Math.floor(this.totalChildRearingAll);
      // 会社負担（合計）
      this.totalCompanyShare = this.totalHealthInsuranceCompany + this.totalNursingCareCompany + this.totalPensionCompany + this.totalChildRearing;

    }
    this.isLoading = false;
  }

  // 年齢計算ロジック
  convertWarekiToSeireki(era: string, year: number): number {
    const eraMap: { [key: string]: number } = { '昭和': 1925, '平成': 1988, '令和': 2018 };
    return eraMap[era] + year;
  }

  // 給与情報の年月の末日を取得
  getLastDayOfMonth(paymentDate: string): Date {
    const [year, month] = paymentDate.split('-').map(Number);
    return new Date(year, month, 0); // 翌月の0日 = 当月の末日
  }

  getAge(birthEra: string, birthYear: number, birthMonth: number, birthDay: number, targetDate: Date): number {
    const birthYearAD = this.convertWarekiToSeireki(birthEra, birthYear);
    const birthDate = new Date(birthYearAD, birthMonth - 1, birthDay);
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    if (targetDate.getMonth() < birthDate.getMonth() || (targetDate.getMonth() === birthDate.getMonth() && targetDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

    // 資格情報のフォーマット
    formatQualification(insuredStatus: string[]): string {
      const hasHealth = insuredStatus.includes('health');
      const hasPension = insuredStatus.includes('pension');
      
      if (hasHealth && hasPension) {
        return '健保・厚生';
      } else if (hasHealth) {
        return '健保';
      } else if (hasPension) {
        return '厚生';
      } else {
        return 'なし';
      }
    }

    // 端数処理（50銭以下は切り下げ、50銭より大きい場合は切り上げ）
    private roundToNearestYen(amount: number): number {
      const decimal = amount - Math.floor(amount);
      if (decimal <= 0.5) {
        return Math.floor(amount);
      } else {
        return Math.ceil(amount);
      }
    }

  async calcPremiums(emp: EmployeeProfile, offices: Office[]): Promise<Premiums | null> {
    // 1. 健康保険・厚生年金の対象か
    const isKenpo = emp.insuredStatus?.includes('health');
    const isKosei = emp.insuredStatus?.includes('pension');

    // 2. 年齢計算（給与情報の年月の末日における年齢）
    const targetDate = this.getLastDayOfMonth(this.selectedPaymentDate);
    const age = this.getAge(
      emp.birthEra,
      Number(emp.birthYear),
      Number(emp.birthMonth),
      Number(emp.birthDay),
      targetDate
    );

    // 3. 介護保険対象
    const isKaigo = age >= 40 && age <= 64;
    // 4. 厚生年金対象外
    const isKoseiTarget = isKosei && age < 70;
    // 5. 健保・厚生対象外
    const isKenpoTarget = isKenpo && age < 75;

    // 6. 標準報酬月額
    const info = await this.standardRemunerationService.getStandardRemunerationInfo(emp.employeeId, this.selectedSalaryType);
    if (!info) {
      console.error('標準報酬月額情報が見つかりません:', emp.employeeId);
      return null;
    }

    const standardRemuneration = info.standardRemuneration || 0;
    const standardRemunerationGrade = info.standardRemunerationGrade || 0;
    const standardRemunerationDate = info.standardRemunerationDate || '';

    // 7. 事業所の都道府県取得
    const employeeOffice = offices.find(o => o.id === emp.office);

    // デフォルトは従業員の所属事業所の都道府県
    let prefecture = employeeOffice?.prefecture || '東京都';

    // bulkApprovalTypeが「一括適用承認」の場合のみ、本店の都道府県に上書き
    if (employeeOffice?.bulkApprovalType === '一括適用承認') {
      const mainOffice = offices.find(o => o.branchSelect === '本店');
      if (mainOffice?.prefecture) {
        prefecture = mainOffice.prefecture;
      }
    }

    // 8. 保険料率取得
    const rates = InsuranceData.getPrefectureRates().find(r => r.name === prefecture);
    if (!rates) {
      console.error('保険料率が見つかりません');
      return null;
    }

    // 9. 保険料計算
    let healthInsurancePremium = 0, nursingCarePremium = 0, pensionInsurancePremium = 0;
    let display_healthInsurancePremium = 0, display_nursingCarePremium = 0, display_pensionInsurancePremium = 0;
    let healthInsurancePremiumCompany = 0, nursingCarePremiumCompany = 0, pensionInsurancePremiumCompany = 0, childRearingContribution = 0;
    let display_healthInsurancePremiumCompany = 0, display_nursingCarePremiumCompany = 0, display_pensionInsurancePremiumCompany = 0, display_childRearingContribution = 0;

    if (isKenpoTarget) {
      // 健康保険料は労使折半
      const totalHealthInsurance = Number(standardRemuneration) * Number(rates.healthInsuranceRate);
      healthInsurancePremium = totalHealthInsurance / 2; // 被保険者負担分
      display_healthInsurancePremium = this.roundToNearestYen(healthInsurancePremium); // 端数処理あり
      healthInsurancePremiumCompany = totalHealthInsurance / 2; // 事業主負担分
      display_healthInsurancePremiumCompany = this.roundToNearestYen(healthInsurancePremiumCompany); // 端数処理あり
    }
    if (isKaigo) {
      // 介護保険料は労使折半
      const totalNursingCare = Number(standardRemuneration) * Number(rates.nursingCareRate);
      nursingCarePremium = totalNursingCare / 2; // 被保険者負担分
      display_nursingCarePremium = this.roundToNearestYen(nursingCarePremium); // 端数処理あり
      nursingCarePremiumCompany = totalNursingCare / 2; // 事業主負担分
      display_nursingCarePremiumCompany = this.roundToNearestYen(nursingCarePremiumCompany); // 端数処理あり
    }
    if (isKoseiTarget) {
      // 標準報酬月額の下限・上限処理
      let adjustedStandardRemuneration = Number(standardRemuneration);
      if (adjustedStandardRemuneration < 88000) {
        adjustedStandardRemuneration = 88000;
      } else if (adjustedStandardRemuneration > 650000) {
        adjustedStandardRemuneration = 650000;
      }

      // 厚生年金保険料は労使折半
      const totalPension = adjustedStandardRemuneration * Number(rates.pensionInsuranceRate);
      pensionInsurancePremium = totalPension / 2; // 被保険者負担分
      display_pensionInsurancePremium = this.roundToNearestYen(pensionInsurancePremium); // 端数処理あり
      pensionInsurancePremiumCompany = totalPension / 2; // 事業主負担分
      display_pensionInsurancePremiumCompany = this.roundToNearestYen(pensionInsurancePremiumCompany); // 端数処理あり
    }
    if (isKenpoTarget) {
      // 子ども子育て拠出金は全額事業主負担
      childRearingContribution = Number(standardRemuneration) * Number(rates.childRearingContributionRate);
      display_childRearingContribution = this.roundToNearestYen(childRearingContribution); // 端数処理あり
    }

    // 10. 合計
    const employeeShare = healthInsurancePremium + nursingCarePremium + pensionInsurancePremium; // 被保険者負担分の合計
    const display_employeeShare = display_healthInsurancePremium + display_nursingCarePremium + display_pensionInsurancePremium; // 被保険者負担分の合計（端数処理・表示用）

    const companyShare = healthInsurancePremiumCompany + nursingCarePremiumCompany + pensionInsurancePremiumCompany + childRearingContribution; // 事業主負担分の合計
    const display_companyShare = display_healthInsurancePremiumCompany + display_nursingCarePremiumCompany + display_pensionInsurancePremiumCompany + display_childRearingContribution; // 事業主負担分の合計（端数処理・表示用）
    
    const totalPremium = employeeShare + companyShare; // 総額
    const display_totalPremium = this.roundToNearestYen(totalPremium); // 総額（端数処理・表示用）

    // 11. 対象外なら空欄でグレーアウト
    if (!isKenpo && !isKosei) {
      return {
        companyId: emp.companyId,
        companyName: emp.companyName,
        employeeId: emp.employeeId,
        employeeName: emp.lastName + '　' + emp.firstName,
        birthDate: '', age: 0, qualification: '', standardRemuneration: 0, standardRemunerationGrade: 0, standardRemunerationDate: '',
        healthInsurancePremium: null, nursingCarePremium: null, pensionInsurancePremium: null, employeeShare: null,
        healthInsurancePremiumCompany: null, nursingCarePremiumCompany: null, pensionInsurancePremiumCompany: null, childRearingContribution: null,
        companyShare: null, totalPremium: null, createdAt: new Date(), updatedAt: new Date(),
        paymentDate: this.selectedPaymentDate,
        salaryType: this.selectedSalaryType,
        // 表示用プロパティ
        display_healthInsurancePremium: null,
        display_nursingCarePremium: null,
        display_pensionInsurancePremium: null,
        display_employeeShare: null,
        display_healthInsurancePremiumCompany: null,
        display_nursingCarePremiumCompany: null,
        display_pensionInsurancePremiumCompany: null,
        display_childRearingContribution: null,
        display_companyShare: null,
        display_totalPremium: null,
      };
    }

    const qualification = this.formatQualification(emp.insuredStatus || []);

    // 12. Premiums型で返却
    return Promise.resolve({
      companyId: emp.companyId,
      companyName: emp.companyName,
      employeeId: emp.employeeId,
      employeeName: emp.lastName + '　' + emp.firstName,
      birthDate: `${emp.birthEra}${emp.birthYear}年${emp.birthMonth}月${emp.birthDay}日`,
      age,
      qualification,
      standardRemuneration,
      standardRemunerationGrade,
      standardRemunerationDate,
      healthInsurancePremium,
      nursingCarePremium,
      pensionInsurancePremium,
      employeeShare,
      healthInsurancePremiumCompany,
      nursingCarePremiumCompany,
      pensionInsurancePremiumCompany,
      childRearingContribution,
      companyShare,
      totalPremium,
      paymentDate: this.selectedPaymentDate,
      salaryType: this.selectedSalaryType,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 表示用プロパティ
      display_healthInsurancePremium,
      display_nursingCarePremium,
      display_pensionInsurancePremium,
      display_employeeShare,
      display_healthInsurancePremiumCompany,
      display_nursingCarePremiumCompany,
      display_pensionInsurancePremiumCompany,
      display_childRearingContribution,
      display_companyShare,
      display_totalPremium
    });
  }

}

