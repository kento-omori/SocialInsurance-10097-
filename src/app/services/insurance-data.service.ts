import { Injectable } from '@angular/core';

// 標準報酬月額と等級のテーブル
export interface GradeEntry {
  grade: number; // 等級
  minMonthlyRemuneration: number; // 報酬月額の下限
  maxMonthlyRemuneration: number; // 報酬月額の上限
  standardMonthlyRemuneration: number; // 標準報酬月額
  displayGrade?: string; // 表示用の等級（括弧付き）
}

// 都道府県ごとの保険料率
export interface PrefectureRate {
  name: string; // 都道府県名
  healthInsuranceRate: number; // 健康保険料率 (介護保険なし)
  nursingCareRate: number; // 介護保険料率
  pensionInsuranceRate: number; // 厚生年金保険料率
  childRearingContributionRate: number; // 子ども・子育て拠出金
}

// 40歳以上の判定に使う年齢
export const NURSING_CARE_APPLICABLE_AGE = 40;

@Injectable({
  providedIn: 'root'
})
export class InsuranceData {
  // 標準報酬月額と等級の全国一律テーブル
  private static gradeTable: GradeEntry[] = [
    { grade: 1, minMonthlyRemuneration: 0, maxMonthlyRemuneration: 63_000, standardMonthlyRemuneration: 58_000 },
    { grade: 2, minMonthlyRemuneration: 63_000, maxMonthlyRemuneration: 73_000, standardMonthlyRemuneration: 68_000 },
    { grade: 3, minMonthlyRemuneration: 73_000, maxMonthlyRemuneration: 83_000, standardMonthlyRemuneration: 78_000 },
    { grade: 4, minMonthlyRemuneration: 83_000, maxMonthlyRemuneration: 93_000, standardMonthlyRemuneration: 88_000 },
    { grade: 5, minMonthlyRemuneration: 93_000, maxMonthlyRemuneration: 101_000, standardMonthlyRemuneration: 98_000 },
    { grade: 6, minMonthlyRemuneration: 101_000, maxMonthlyRemuneration: 107_000, standardMonthlyRemuneration: 104_000 },
    { grade: 7, minMonthlyRemuneration: 107_000, maxMonthlyRemuneration: 114_000, standardMonthlyRemuneration: 110_000 },
    { grade: 8, minMonthlyRemuneration: 114_000, maxMonthlyRemuneration: 122_000, standardMonthlyRemuneration: 118_000 },
    { grade: 9, minMonthlyRemuneration: 122_000, maxMonthlyRemuneration: 130_000, standardMonthlyRemuneration: 126_000 },
    { grade: 10, minMonthlyRemuneration: 130_000, maxMonthlyRemuneration: 138_000, standardMonthlyRemuneration: 134_000 },
    { grade: 11, minMonthlyRemuneration: 138_000, maxMonthlyRemuneration: 146_000, standardMonthlyRemuneration: 142_000 },
    { grade: 12, minMonthlyRemuneration: 146_000, maxMonthlyRemuneration: 155_000, standardMonthlyRemuneration: 150_000 },
    { grade: 13, minMonthlyRemuneration: 155_000, maxMonthlyRemuneration: 165_000, standardMonthlyRemuneration: 160_000 },
    { grade: 14, minMonthlyRemuneration: 165_000, maxMonthlyRemuneration: 175_000, standardMonthlyRemuneration: 170_000 },
    { grade: 15, minMonthlyRemuneration: 175_000, maxMonthlyRemuneration: 185_000, standardMonthlyRemuneration: 180_000 },
    { grade: 16, minMonthlyRemuneration: 185_000, maxMonthlyRemuneration: 195_000, standardMonthlyRemuneration: 190_000 },
    { grade: 17, minMonthlyRemuneration: 195_000, maxMonthlyRemuneration: 210_000, standardMonthlyRemuneration: 200_000 },
    { grade: 18, minMonthlyRemuneration: 210_000, maxMonthlyRemuneration: 230_000, standardMonthlyRemuneration: 220_000 },
    { grade: 19, minMonthlyRemuneration: 230_000, maxMonthlyRemuneration: 250_000, standardMonthlyRemuneration: 240_000 },
    { grade: 20, minMonthlyRemuneration: 250_000, maxMonthlyRemuneration: 270_000, standardMonthlyRemuneration: 260_000 },
    { grade: 21, minMonthlyRemuneration: 270_000, maxMonthlyRemuneration: 290_000, standardMonthlyRemuneration: 280_000 },
    { grade: 22, minMonthlyRemuneration: 290_000, maxMonthlyRemuneration: 310_000, standardMonthlyRemuneration: 300_000 },
    { grade: 23, minMonthlyRemuneration: 310_000, maxMonthlyRemuneration: 330_000, standardMonthlyRemuneration: 320_000 },
    { grade: 24, minMonthlyRemuneration: 330_000, maxMonthlyRemuneration: 350_000, standardMonthlyRemuneration: 340_000 },
    { grade: 25, minMonthlyRemuneration: 350_000, maxMonthlyRemuneration: 370_000, standardMonthlyRemuneration: 360_000 },
    { grade: 26, minMonthlyRemuneration: 370_000, maxMonthlyRemuneration: 395_000, standardMonthlyRemuneration: 380_000 },
    { grade: 27, minMonthlyRemuneration: 395_000, maxMonthlyRemuneration: 425_000, standardMonthlyRemuneration: 410_000 },
    { grade: 28, minMonthlyRemuneration: 425_000, maxMonthlyRemuneration: 455_000, standardMonthlyRemuneration: 440_000 },
    { grade: 29, minMonthlyRemuneration: 455_000, maxMonthlyRemuneration: 485_000, standardMonthlyRemuneration: 470_000 },
    { grade: 30, minMonthlyRemuneration: 485_000, maxMonthlyRemuneration: 515_000, standardMonthlyRemuneration: 500_000 },
    { grade: 31, minMonthlyRemuneration: 515_000, maxMonthlyRemuneration: 545_000, standardMonthlyRemuneration: 530_000 },
    { grade: 32, minMonthlyRemuneration: 545_000, maxMonthlyRemuneration: 575_000, standardMonthlyRemuneration: 560_000 },
    { grade: 33, minMonthlyRemuneration: 575_000, maxMonthlyRemuneration: 605_000, standardMonthlyRemuneration: 590_000 },
    { grade: 34, minMonthlyRemuneration: 605_000, maxMonthlyRemuneration: 635_000, standardMonthlyRemuneration: 620_000 },
    { grade: 35, minMonthlyRemuneration: 635_000, maxMonthlyRemuneration: 650_000, standardMonthlyRemuneration: 650_000 },
    { grade: 36, minMonthlyRemuneration: 665_000, maxMonthlyRemuneration: 695_000, standardMonthlyRemuneration: 680_000 },
    { grade: 37, minMonthlyRemuneration: 695_000, maxMonthlyRemuneration: 730_000, standardMonthlyRemuneration: 710_000 },
    { grade: 38, minMonthlyRemuneration: 730_000, maxMonthlyRemuneration: 770_000, standardMonthlyRemuneration: 750_000 },
    { grade: 39, minMonthlyRemuneration: 770_000, maxMonthlyRemuneration: 810_000, standardMonthlyRemuneration: 790_000 },
    { grade: 40, minMonthlyRemuneration: 810_000, maxMonthlyRemuneration: 855_000, standardMonthlyRemuneration: 830_000 },
    { grade: 41, minMonthlyRemuneration: 855_000, maxMonthlyRemuneration: 905_000, standardMonthlyRemuneration: 880_000 },
    { grade: 42, minMonthlyRemuneration: 905_000, maxMonthlyRemuneration: 955_000, standardMonthlyRemuneration: 930_000 },
    { grade: 43, minMonthlyRemuneration: 955_000, maxMonthlyRemuneration: 1_005_000, standardMonthlyRemuneration: 980_000 },
    { grade: 44, minMonthlyRemuneration: 1_005_000, maxMonthlyRemuneration: 1_055_000, standardMonthlyRemuneration: 1_030_000 },
    { grade: 45, minMonthlyRemuneration: 1_055_000, maxMonthlyRemuneration: 1_115_000, standardMonthlyRemuneration: 1_090_000 },
    { grade: 46, minMonthlyRemuneration: 1_115_000, maxMonthlyRemuneration: 1_175_000, standardMonthlyRemuneration: 1_150_000 },
    { grade: 47, minMonthlyRemuneration: 1_175_000, maxMonthlyRemuneration: 1_235_000, standardMonthlyRemuneration: 1_210_000 },
    { grade: 48, minMonthlyRemuneration: 1_235_000, maxMonthlyRemuneration: 1_295_000, standardMonthlyRemuneration: 1_270_000 },
    { grade: 49, minMonthlyRemuneration: 1_295_000, maxMonthlyRemuneration: 1_355_000, standardMonthlyRemuneration: 1_330_000 },
    { grade: 50, minMonthlyRemuneration: 1_355_000, maxMonthlyRemuneration: Infinity, standardMonthlyRemuneration: 1_390_000 }
  ];

  // 都道府県ごとの保険料率(R7年度)
  private static prefectureRates: PrefectureRate[] = [
    { name: '北海道', healthInsuranceRate: 0.1031, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '青森県', healthInsuranceRate: 0.0985, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '岩手県', healthInsuranceRate: 0.0962, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '宮城県', healthInsuranceRate: 0.1011, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '秋田県', healthInsuranceRate: 0.1001, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '山形県', healthInsuranceRate: 0.0975, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '福島県', healthInsuranceRate: 0.0962, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '茨城県', healthInsuranceRate: 0.0967, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '栃木県', healthInsuranceRate: 0.0982, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '群馬県', healthInsuranceRate: 0.0977, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '埼玉県', healthInsuranceRate: 0.0976, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '千葉県', healthInsuranceRate: 0.0979, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '東京都', healthInsuranceRate: 0.0991, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '神奈川県', healthInsuranceRate: 0.0992, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '新潟県', healthInsuranceRate: 0.0955 , nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '富山県', healthInsuranceRate: 0.0965, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '石川県', healthInsuranceRate: 0.0988, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '福井県', healthInsuranceRate: 0.0994, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '山梨県', healthInsuranceRate: 0.0989, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '長野県', healthInsuranceRate: 0.0969, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '岐阜県', healthInsuranceRate: 0.0993, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '静岡県', healthInsuranceRate: 0.0980 , nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '愛知県', healthInsuranceRate: 0.1003, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '三重県', healthInsuranceRate: 0.0999, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '滋賀県', healthInsuranceRate: 0.0997, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '京都府', healthInsuranceRate: 0.1003, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '大阪府', healthInsuranceRate: 0.1024, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '兵庫県', healthInsuranceRate: 0.1016, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '奈良県', healthInsuranceRate: 0.1002, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '和歌山県', healthInsuranceRate: 0.1019, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '鳥取県', healthInsuranceRate: 0.0993, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '島根県', healthInsuranceRate: 0.0994, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036  },
    { name: '岡山県', healthInsuranceRate: 0.1017, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '広島県', healthInsuranceRate: 0.0997, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '山口県', healthInsuranceRate: 0.1036, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '徳島県', healthInsuranceRate: 0.1047, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '香川県', healthInsuranceRate: 0.1021, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '愛媛県', healthInsuranceRate: 0.1018, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '高知県', healthInsuranceRate: 0.1013, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '福岡県', healthInsuranceRate: 0.1031, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '佐賀県', healthInsuranceRate: 0.1078, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '長崎県', healthInsuranceRate: 0.1041, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '熊本県', healthInsuranceRate: 0.1012, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '大分県', healthInsuranceRate: 0.1025, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '宮崎県', healthInsuranceRate: 0.1009, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '鹿児島県', healthInsuranceRate: 0.1031, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 },
    { name: '沖縄県', healthInsuranceRate: 0.0944, nursingCareRate: 0.0159, pensionInsuranceRate: 0.1830, childRearingContributionRate: 0.0036 }
  ];

  static getGradeTable(): GradeEntry[] {
    return this.gradeTable;
  }

  static getPrefectureRates(): PrefectureRate[] {
    return this.prefectureRates;
  }
}