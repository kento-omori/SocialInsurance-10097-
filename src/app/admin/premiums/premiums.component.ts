import { Component, OnInit } from '@angular/core';
import { InsuranceDataService, GradeEntry, PrefectureRate, NURSING_CARE_APPLICABLE_AGE, PENSION_INSURANCE_RATE, CHILD_REARING_CONTRIBUTION_RATE, NURSING_CARE_RATE } from '../../services/insurance-data.service';

@Component({
  selector: 'app-premiums',
  standalone: true,
  imports: [],
  templateUrl: './premiums.component.html',
  styleUrl: './premiums.component.css'
})
export class PremiumsComponent implements OnInit {
  prefectures: string[] = [];
  gradeTable: GradeEntry[] = [];
  prefectureRates: PrefectureRate[] = [];
  pensionInsuranceRate: number = PENSION_INSURANCE_RATE;
  childRearingContributionRate: number = CHILD_REARING_CONTRIBUTION_RATE;
  nursingCareRate: number = NURSING_CARE_RATE;
  selectedPrefecture: string = '';
  monthlyRemunerationInput: number | null = null; // 報酬月額をユーザーが入力すると仮定
  ageInput: number | null = null; // 年齢を入力

 // 計算結果
 standardMonthlyRemuneration: number | null = null;
 healthInsurancePremium: number | null = null;
 pensionInsurancePremium: number | null = null;
 nursingCarePremium: number | null = null;
 childRearingContribution: number | null = null;

 // 料率表示用
 currentHealthInsuranceRate: number | null = null;
 currentPensionInsuranceRate: number | null = null;
 currentNursingCareRate: number | null = null; // 介護保険料率のみ
 currentChildRearingContributionRate: number | null = null;

 errorMessage: string = '';

 constructor(private insuranceDataService: InsuranceDataService) { }

 ngOnInit(): void {
   this.gradeTable = this.insuranceDataService.getGradeTable();
   this.prefectureRates = this.insuranceDataService.getPrefectureRates();
   this.prefectures = this.prefectureRates.map(rate => rate.name);

   if (this.prefectures.length > 0) {
     this.selectedPrefecture = this.prefectures[0]; // デフォルト選択
   }
 }

 calculateInsurance(): void {
   this.errorMessage = '';
   this.resetResults();

   if (!this.selectedPrefecture) {
     this.errorMessage = '都道府県を選択してください。';
     return;
   }
   if (this.monthlyRemunerationInput === null || this.monthlyRemunerationInput <= 0) {
     this.errorMessage = '有効な報酬月額を入力してください。';
     return;
   }
   if (this.ageInput === null || this.ageInput < 0) {
     this.errorMessage = '有効な年齢を入力してください。';
     return;
   }

   // 報酬月額から標準報酬月額を算出
   const foundGrade = this.gradeTable.find(entry =>
     this.monthlyRemunerationInput! >= entry.minMonthlyRemuneration &&
     this.monthlyRemunerationInput! < entry.maxMonthlyRemuneration
   );

   if (!foundGrade) {
     this.errorMessage = '入力された報酬月額に対応する等級が見つかりませんでした。';
     return;
   }
   this.standardMonthlyRemuneration = foundGrade.standardMonthlyRemuneration;

   // 選択された都道府県の料率を取得
   const selectedRate = this.prefectureRates.find(rate => rate.name === this.selectedPrefecture);
   if (!selectedRate) {
     this.errorMessage = '選択された都道府県の料率が見つかりません。';
     return;
   }

   // 各保険料の計算（被保険者と事業主の折半額を考慮せず、単純に標準報酬月額 x 料率）
   // 実際には折半額で計算し、事業主負担分も考慮するかはアプリの要件によります。
   this.healthInsurancePremium = this.standardMonthlyRemuneration * selectedRate.healthInsuranceRate;
   this.pensionInsurancePremium = this.standardMonthlyRemuneration * this.pensionInsuranceRate;
   
   // 介護保険料は40歳以上で適用
   if (this.ageInput >= NURSING_CARE_APPLICABLE_AGE) {
     this.nursingCarePremium = this.standardMonthlyRemuneration * this.nursingCareRate;
     // 健康保険料に介護保険料が加算された料率を表示したい場合は、healthInsuranceRate + nursingCareRate を表示
   } else {
     this.nursingCarePremium = 0;
   }

   this.childRearingContribution = this.standardMonthlyRemuneration * this.insuranceDataService.getChildRearingContributionRate();

   // 料率を表示
   this.currentHealthInsuranceRate = selectedRate.healthInsuranceRate;
   this.currentPensionInsuranceRate = this.pensionInsuranceRate;
   this.currentNursingCareRate = this.nursingCareRate;
   this.currentChildRearingContributionRate = this.insuranceDataService.getChildRearingContributionRate();
 }

 private resetResults(): void {
   this.standardMonthlyRemuneration = null;
   this.healthInsurancePremium = null;
   this.pensionInsurancePremium = null;
   this.nursingCarePremium = null;
   this.childRearingContribution = null;
   this.currentHealthInsuranceRate = null;
   this.currentPensionInsuranceRate = null;
   this.currentNursingCareRate = null;
   this.currentChildRearingContributionRate = null;
 }
}

