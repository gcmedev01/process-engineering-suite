/**
 * Pipe Schedule Data
 * Inner diameter lookup tables for NPS (Nominal Pipe Size) and various schedules.
 * Data derived from: https://github.com/CalebBell/fluids/blob/master/fluids/piping.py
 */

export type PipeSchedule =
    | "5" | "10" | "20" | "30" | "40" | "60" | "80" | "100" | "120" | "140" | "160"
    | "STD" | "XS" | "XXS"
    | "5S" | "10S" | "40S" | "80S";

type PipeScheduleEntry = {
    nps: number;
    innerDiameterMm: number;
};

const SCHEDULE_DATA: Record<PipeSchedule, ReadonlyArray<PipeScheduleEntry>> = {
    "5": [
        { nps: 0.5, innerDiameterMm: 18 },
        { nps: 0.75, innerDiameterMm: 23.4 },
        { nps: 1, innerDiameterMm: 30.1 },
        { nps: 1.25, innerDiameterMm: 38.9 },
        { nps: 1.5, innerDiameterMm: 45 },
        { nps: 2, innerDiameterMm: 57 },
        { nps: 2.5, innerDiameterMm: 68.78 },
        { nps: 3, innerDiameterMm: 84.68 },
        { nps: 3.5, innerDiameterMm: 97.38 },
        { nps: 4, innerDiameterMm: 110.08 },
        { nps: 5, innerDiameterMm: 135.76 },
        { nps: 6, innerDiameterMm: 162.76 },
        { nps: 8, innerDiameterMm: 213.56 },
        { nps: 10, innerDiameterMm: 266.2 },
        { nps: 12, innerDiameterMm: 315.88 },
        { nps: 14, innerDiameterMm: 347.68 },
        { nps: 16, innerDiameterMm: 398.02 },
        { nps: 18, innerDiameterMm: 448.62 },
        { nps: 20, innerDiameterMm: 498.44 },
        { nps: 22, innerDiameterMm: 549.44 },
        { nps: 24, innerDiameterMm: 598.92 },
        { nps: 30, innerDiameterMm: 749.3 },
    ],
    "10": [
        { nps: 0.125, innerDiameterMm: 7.82 },
        { nps: 0.25, innerDiameterMm: 10.4 },
        { nps: 0.375, innerDiameterMm: 13.8 },
        { nps: 0.5, innerDiameterMm: 17.08 },
        { nps: 0.75, innerDiameterMm: 22.48 },
        { nps: 1, innerDiameterMm: 27.86 },
        { nps: 1.25, innerDiameterMm: 36.66 },
        { nps: 1.5, innerDiameterMm: 42.76 },
        { nps: 2, innerDiameterMm: 54.76 },
        { nps: 2.5, innerDiameterMm: 66.9 },
        { nps: 3, innerDiameterMm: 82.8 },
        { nps: 3.5, innerDiameterMm: 95.5 },
        { nps: 4, innerDiameterMm: 108.2 },
        { nps: 5, innerDiameterMm: 134.5 },
        { nps: 6, innerDiameterMm: 161.5 },
        { nps: 8, innerDiameterMm: 211.58 },
        { nps: 10, innerDiameterMm: 264.62 },
        { nps: 12, innerDiameterMm: 314.66 },
        { nps: 14, innerDiameterMm: 342.9 },
        { nps: 16, innerDiameterMm: 393.7 },
        { nps: 18, innerDiameterMm: 444.3 },
        { nps: 20, innerDiameterMm: 495.3 },
        { nps: 22, innerDiameterMm: 546.3 },
        { nps: 24, innerDiameterMm: 597.3 },
        { nps: 26, innerDiameterMm: 644.16 },
        { nps: 28, innerDiameterMm: 695.16 },
        { nps: 30, innerDiameterMm: 746.16 },
        { nps: 32, innerDiameterMm: 797.16 },
        { nps: 34, innerDiameterMm: 848.16 },
        { nps: 36, innerDiameterMm: 898.16 },
    ],
    "20": [
        { nps: 8, innerDiameterMm: 206.4 },
        { nps: 10, innerDiameterMm: 260.3 },
        { nps: 12, innerDiameterMm: 311.1 },
        { nps: 14, innerDiameterMm: 339.76 },
        { nps: 16, innerDiameterMm: 390.56 },
        { nps: 18, innerDiameterMm: 441.16 },
        { nps: 20, innerDiameterMm: 488.94 },
        { nps: 22, innerDiameterMm: 539.94 },
        { nps: 24, innerDiameterMm: 590.94 },
        { nps: 26, innerDiameterMm: 634.6 },
        { nps: 28, innerDiameterMm: 685.6 },
        { nps: 30, innerDiameterMm: 736.6 },
        { nps: 32, innerDiameterMm: 787.6 },
        { nps: 34, innerDiameterMm: 838.6 },
        { nps: 36, innerDiameterMm: 888.6 },
    ],
    "30": [
        { nps: 0.125, innerDiameterMm: 7.4 },
        { nps: 0.25, innerDiameterMm: 10 },
        { nps: 0.375, innerDiameterMm: 13.4 },
        { nps: 0.5, innerDiameterMm: 16.48 },
        { nps: 0.75, innerDiameterMm: 21.88 },
        { nps: 1, innerDiameterMm: 27.6 },
        { nps: 1.25, innerDiameterMm: 36.26 },
        { nps: 1.5, innerDiameterMm: 41.94 },
        { nps: 2, innerDiameterMm: 53.94 },
        { nps: 2.5, innerDiameterMm: 63.44 },
        { nps: 3, innerDiameterMm: 79.34 },
        { nps: 3.5, innerDiameterMm: 92.04 },
        { nps: 4, innerDiameterMm: 104.74 },
        { nps: 8, innerDiameterMm: 205.02 },
        { nps: 10, innerDiameterMm: 257.4 },
        { nps: 12, innerDiameterMm: 307.04 },
        { nps: 14, innerDiameterMm: 336.54 },
        { nps: 16, innerDiameterMm: 387.34 },
        { nps: 18, innerDiameterMm: 434.74 },
        { nps: 20, innerDiameterMm: 482.6 },
        { nps: 22, innerDiameterMm: 533.6 },
        { nps: 24, innerDiameterMm: 581.46 },
        { nps: 28, innerDiameterMm: 679.24 },
        { nps: 30, innerDiameterMm: 730.24 },
        { nps: 32, innerDiameterMm: 781.24 },
        { nps: 34, innerDiameterMm: 832.24 },
        { nps: 36, innerDiameterMm: 882.24 },
    ],
    "40": [
        { nps: 0.125, innerDiameterMm: 6.84 },
        { nps: 0.25, innerDiameterMm: 9.22 },
        { nps: 0.375, innerDiameterMm: 12.48 },
        { nps: 0.5, innerDiameterMm: 15.76 },
        { nps: 0.75, innerDiameterMm: 20.96 },
        { nps: 1, innerDiameterMm: 26.64 },
        { nps: 1.25, innerDiameterMm: 35.08 },
        { nps: 1.5, innerDiameterMm: 40.94 },
        { nps: 2, innerDiameterMm: 52.48 },
        { nps: 2.5, innerDiameterMm: 62.68 },
        { nps: 3, innerDiameterMm: 77.92 },
        { nps: 3.5, innerDiameterMm: 90.12 },
        { nps: 4, innerDiameterMm: 102.26 },
        { nps: 5, innerDiameterMm: 128.2 },
        { nps: 6, innerDiameterMm: 154.08 },
        { nps: 8, innerDiameterMm: 202.74 },
        { nps: 10, innerDiameterMm: 254.46 },
        { nps: 12, innerDiameterMm: 303.18 },
        { nps: 14, innerDiameterMm: 333.34 },
        { nps: 16, innerDiameterMm: 381 },
        { nps: 18, innerDiameterMm: 428.46 },
        { nps: 20, innerDiameterMm: 477.82 },
        { nps: 24, innerDiameterMm: 575.04 },
        { nps: 32, innerDiameterMm: 778.04 },
        { nps: 34, innerDiameterMm: 829.04 },
        { nps: 36, innerDiameterMm: 875.9 },
    ],
    "60": [
        { nps: 8, innerDiameterMm: 198.48 },
        { nps: 10, innerDiameterMm: 247.6 },
        { nps: 12, innerDiameterMm: 295.26 },
        { nps: 14, innerDiameterMm: 325.42 },
        { nps: 16, innerDiameterMm: 373.08 },
        { nps: 18, innerDiameterMm: 418.9 },
        { nps: 20, innerDiameterMm: 466.76 },
        { nps: 22, innerDiameterMm: 514.54 },
        { nps: 24, innerDiameterMm: 560.78 },
    ],
    "80": [
        { nps: 0.125, innerDiameterMm: 5.48 },
        { nps: 0.25, innerDiameterMm: 7.66 },
        { nps: 0.375, innerDiameterMm: 10.7 },
        { nps: 0.5, innerDiameterMm: 13.84 },
        { nps: 0.75, innerDiameterMm: 18.88 },
        { nps: 1, innerDiameterMm: 24.3 },
        { nps: 1.25, innerDiameterMm: 32.5 },
        { nps: 1.5, innerDiameterMm: 38.14 },
        { nps: 2, innerDiameterMm: 49.22 },
        { nps: 2.5, innerDiameterMm: 58.98 },
        { nps: 3, innerDiameterMm: 73.66 },
        { nps: 3.5, innerDiameterMm: 85.44 },
        { nps: 4, innerDiameterMm: 97.18 },
        { nps: 5, innerDiameterMm: 122.24 },
        { nps: 6, innerDiameterMm: 146.36 },
        { nps: 8, innerDiameterMm: 193.7 },
        { nps: 10, innerDiameterMm: 242.82 },
        { nps: 12, innerDiameterMm: 288.84 },
        { nps: 14, innerDiameterMm: 317.5 },
        { nps: 16, innerDiameterMm: 363.52 },
        { nps: 18, innerDiameterMm: 409.34 },
        { nps: 20, innerDiameterMm: 455.62 },
        { nps: 22, innerDiameterMm: 501.84 },
        { nps: 24, innerDiameterMm: 548.08 },
    ],
    "100": [
        { nps: 8, innerDiameterMm: 188.92 },
        { nps: 10, innerDiameterMm: 236.48 },
        { nps: 12, innerDiameterMm: 280.92 },
        { nps: 14, innerDiameterMm: 307.94 },
        { nps: 16, innerDiameterMm: 354.02 },
        { nps: 18, innerDiameterMm: 398.28 },
        { nps: 20, innerDiameterMm: 442.92 },
        { nps: 22, innerDiameterMm: 489.14 },
        { nps: 24, innerDiameterMm: 532.22 },
    ],
    "120": [
        { nps: 4, innerDiameterMm: 92.04 },
        { nps: 5, innerDiameterMm: 115.9 },
        { nps: 6, innerDiameterMm: 139.76 },
        { nps: 8, innerDiameterMm: 182.58 },
        { nps: 10, innerDiameterMm: 230.12 },
        { nps: 12, innerDiameterMm: 273 },
        { nps: 14, innerDiameterMm: 300.02 },
        { nps: 16, innerDiameterMm: 344.48 },
        { nps: 18, innerDiameterMm: 387.14 },
        { nps: 20, innerDiameterMm: 431.8 },
        { nps: 22, innerDiameterMm: 476.44 },
        { nps: 24, innerDiameterMm: 517.96 },
    ],
    "140": [
        { nps: 8, innerDiameterMm: 177.86 },
        { nps: 10, innerDiameterMm: 222.2 },
        { nps: 12, innerDiameterMm: 266.64 },
        { nps: 14, innerDiameterMm: 292.1 },
        { nps: 16, innerDiameterMm: 333.34 },
        { nps: 18, innerDiameterMm: 377.66 },
        { nps: 20, innerDiameterMm: 419.1 },
        { nps: 22, innerDiameterMm: 463.74 },
        { nps: 24, innerDiameterMm: 505.26 },
    ],
    "160": [
        { nps: 0.5, innerDiameterMm: 11.74 },
        { nps: 0.75, innerDiameterMm: 15.58 },
        { nps: 1, innerDiameterMm: 20.7 },
        { nps: 1.25, innerDiameterMm: 29.5 },
        { nps: 1.5, innerDiameterMm: 34.02 },
        { nps: 2, innerDiameterMm: 42.82 },
        { nps: 2.5, innerDiameterMm: 53.94 },
        { nps: 3, innerDiameterMm: 66.64 },
        { nps: 4, innerDiameterMm: 87.32 },
        { nps: 5, innerDiameterMm: 109.54 },
        { nps: 6, innerDiameterMm: 131.78 },
        { nps: 8, innerDiameterMm: 173.08 },
        { nps: 10, innerDiameterMm: 215.84 },
        { nps: 12, innerDiameterMm: 257.16 },
        { nps: 14, innerDiameterMm: 284.18 },
        { nps: 16, innerDiameterMm: 325.42 },
        { nps: 18, innerDiameterMm: 366.52 },
        { nps: 20, innerDiameterMm: 407.98 },
        { nps: 22, innerDiameterMm: 451.04 },
        { nps: 24, innerDiameterMm: 490.92 },
    ],
    "STD": [
        { nps: 0.125, innerDiameterMm: 6.84 },
        { nps: 0.25, innerDiameterMm: 9.22 },
        { nps: 0.375, innerDiameterMm: 12.48 },
        { nps: 0.5, innerDiameterMm: 15.76 },
        { nps: 0.75, innerDiameterMm: 20.96 },
        { nps: 1, innerDiameterMm: 26.64 },
        { nps: 1.25, innerDiameterMm: 35.08 },
        { nps: 1.5, innerDiameterMm: 40.94 },
        { nps: 2, innerDiameterMm: 52.48 },
        { nps: 2.5, innerDiameterMm: 62.68 },
        { nps: 3, innerDiameterMm: 77.92 },
        { nps: 3.5, innerDiameterMm: 90.12 },
        { nps: 4, innerDiameterMm: 102.26 },
        { nps: 5, innerDiameterMm: 128.2 },
        { nps: 6, innerDiameterMm: 154.08 },
        { nps: 8, innerDiameterMm: 202.74 },
        { nps: 10, innerDiameterMm: 254.46 },
        { nps: 12, innerDiameterMm: 304.74 },
        { nps: 14, innerDiameterMm: 336.54 },
        { nps: 16, innerDiameterMm: 387.34 },
        { nps: 18, innerDiameterMm: 437.94 },
        { nps: 20, innerDiameterMm: 488.94 },
        { nps: 22, innerDiameterMm: 539.94 },
        { nps: 24, innerDiameterMm: 590.94 },
        { nps: 26, innerDiameterMm: 640.94 },
        { nps: 28, innerDiameterMm: 691.94 },
        { nps: 30, innerDiameterMm: 742.94 },
        { nps: 32, innerDiameterMm: 793.94 },
        { nps: 34, innerDiameterMm: 844.94 },
        { nps: 36, innerDiameterMm: 894.94 },
        { nps: 38, innerDiameterMm: 945.94 },
        { nps: 40, innerDiameterMm: 996.94 },
        { nps: 42, innerDiameterMm: 1047.94 },
        { nps: 44, innerDiameterMm: 1098.94 },
        { nps: 46, innerDiameterMm: 1148.94 },
        { nps: 48, innerDiameterMm: 1199.94 },
    ],
    "XS": [
        { nps: 0.125, innerDiameterMm: 5.48 },
        { nps: 0.25, innerDiameterMm: 7.66 },
        { nps: 0.375, innerDiameterMm: 10.7 },
        { nps: 0.5, innerDiameterMm: 13.84 },
        { nps: 0.75, innerDiameterMm: 18.88 },
        { nps: 1, innerDiameterMm: 24.3 },
        { nps: 1.25, innerDiameterMm: 32.5 },
        { nps: 1.5, innerDiameterMm: 38.14 },
        { nps: 2, innerDiameterMm: 49.22 },
        { nps: 2.5, innerDiameterMm: 58.98 },
        { nps: 3, innerDiameterMm: 73.66 },
        { nps: 3.5, innerDiameterMm: 85.44 },
        { nps: 4, innerDiameterMm: 97.18 },
        { nps: 5, innerDiameterMm: 122.24 },
        { nps: 6, innerDiameterMm: 146.36 },
        { nps: 8, innerDiameterMm: 193.7 },
        { nps: 10, innerDiameterMm: 247.6 },
        { nps: 12, innerDiameterMm: 298.4 },
        { nps: 14, innerDiameterMm: 330.2 },
        { nps: 16, innerDiameterMm: 381 },
        { nps: 18, innerDiameterMm: 431.6 },
        { nps: 20, innerDiameterMm: 482.6 },
        { nps: 22, innerDiameterMm: 533.6 },
        { nps: 24, innerDiameterMm: 584.6 },
        { nps: 26, innerDiameterMm: 634.6 },
        { nps: 28, innerDiameterMm: 685.6 },
        { nps: 30, innerDiameterMm: 736.6 },
        { nps: 32, innerDiameterMm: 787.6 },
        { nps: 34, innerDiameterMm: 838.6 },
        { nps: 36, innerDiameterMm: 888.6 },
        { nps: 38, innerDiameterMm: 939.6 },
        { nps: 40, innerDiameterMm: 990.6 },
        { nps: 42, innerDiameterMm: 1041.6 },
        { nps: 44, innerDiameterMm: 1092.6 },
        { nps: 46, innerDiameterMm: 1142.6 },
        { nps: 48, innerDiameterMm: 1193.6 },
    ],
    "XXS": [
        { nps: 0.5, innerDiameterMm: 6.36 },
        { nps: 0.75, innerDiameterMm: 11.06 },
        { nps: 1, innerDiameterMm: 15.22 },
        { nps: 1.25, innerDiameterMm: 22.8 },
        { nps: 1.5, innerDiameterMm: 28 },
        { nps: 2, innerDiameterMm: 38.16 },
        { nps: 2.5, innerDiameterMm: 44.96 },
        { nps: 3, innerDiameterMm: 58.42 },
        { nps: 4, innerDiameterMm: 80.06 },
        { nps: 5, innerDiameterMm: 103.2 },
        { nps: 6, innerDiameterMm: 124.4 },
        { nps: 8, innerDiameterMm: 174.64 },
        { nps: 10, innerDiameterMm: 222.2 },
        { nps: 12, innerDiameterMm: 273 },
    ],
    "5S": [
        { nps: 0.5, innerDiameterMm: 18 },
        { nps: 0.75, innerDiameterMm: 23.4 },
        { nps: 1, innerDiameterMm: 30.1 },
        { nps: 1.25, innerDiameterMm: 38.9 },
        { nps: 1.5, innerDiameterMm: 45 },
        { nps: 2, innerDiameterMm: 57 },
        { nps: 2.5, innerDiameterMm: 68.78 },
        { nps: 3, innerDiameterMm: 84.68 },
        { nps: 3.5, innerDiameterMm: 97.38 },
        { nps: 4, innerDiameterMm: 110.08 },
        { nps: 5, innerDiameterMm: 135.76 },
        { nps: 6, innerDiameterMm: 162.76 },
        { nps: 8, innerDiameterMm: 213.56 },
        { nps: 10, innerDiameterMm: 266.3 },
        { nps: 12, innerDiameterMm: 315.98 },
        { nps: 14, innerDiameterMm: 347.68 },
        { nps: 16, innerDiameterMm: 398.02 },
        { nps: 18, innerDiameterMm: 448.62 },
        { nps: 20, innerDiameterMm: 498.44 },
        { nps: 22, innerDiameterMm: 549.44 },
        { nps: 24, innerDiameterMm: 598.92 },
        { nps: 30, innerDiameterMm: 749.3 },
    ],
    "10S": [
        { nps: 0.125, innerDiameterMm: 7.82 },
        { nps: 0.25, innerDiameterMm: 10.4 },
        { nps: 0.375, innerDiameterMm: 13.8 },
        { nps: 0.5, innerDiameterMm: 17.08 },
        { nps: 0.75, innerDiameterMm: 22.48 },
        { nps: 1, innerDiameterMm: 27.86 },
        { nps: 1.25, innerDiameterMm: 36.66 },
        { nps: 1.5, innerDiameterMm: 42.76 },
        { nps: 2, innerDiameterMm: 54.76 },
        { nps: 2.5, innerDiameterMm: 66.9 },
        { nps: 3, innerDiameterMm: 82.8 },
        { nps: 3.5, innerDiameterMm: 95.5 },
        { nps: 4, innerDiameterMm: 108.2 },
        { nps: 5, innerDiameterMm: 134.5 },
        { nps: 6, innerDiameterMm: 161.5 },
        { nps: 8, innerDiameterMm: 211.58 },
        { nps: 10, innerDiameterMm: 264.72 },
        { nps: 12, innerDiameterMm: 314.76 },
        { nps: 14, innerDiameterMm: 346.04 },
        { nps: 16, innerDiameterMm: 396.84 },
        { nps: 18, innerDiameterMm: 447.44 },
        { nps: 20, innerDiameterMm: 496.92 },
        { nps: 22, innerDiameterMm: 547.92 },
        { nps: 24, innerDiameterMm: 597.3 },
        { nps: 30, innerDiameterMm: 746.16 },
    ],
    "40S": [
        { nps: 0.125, innerDiameterMm: 6.84 },
        { nps: 0.25, innerDiameterMm: 9.22 },
        { nps: 0.375, innerDiameterMm: 12.48 },
        { nps: 0.5, innerDiameterMm: 15.76 },
        { nps: 0.75, innerDiameterMm: 20.96 },
        { nps: 1, innerDiameterMm: 26.64 },
        { nps: 1.25, innerDiameterMm: 35.08 },
        { nps: 1.5, innerDiameterMm: 40.94 },
        { nps: 2, innerDiameterMm: 52.48 },
        { nps: 2.5, innerDiameterMm: 62.68 },
        { nps: 3, innerDiameterMm: 77.92 },
        { nps: 3.5, innerDiameterMm: 90.12 },
        { nps: 4, innerDiameterMm: 102.26 },
        { nps: 5, innerDiameterMm: 128.2 },
        { nps: 6, innerDiameterMm: 154.08 },
        { nps: 8, innerDiameterMm: 202.74 },
        { nps: 10, innerDiameterMm: 254.56 },
        { nps: 12, innerDiameterMm: 304.84 },
        { nps: 14, innerDiameterMm: 336.54 },
        { nps: 16, innerDiameterMm: 387.34 },
        { nps: 18, innerDiameterMm: 437.94 },
        { nps: 20, innerDiameterMm: 488.94 },
        { nps: 24, innerDiameterMm: 590.94 },
    ],
    "80S": [
        { nps: 0.125, innerDiameterMm: 5.48 },
        { nps: 0.25, innerDiameterMm: 7.66 },
        { nps: 0.375, innerDiameterMm: 10.7 },
        { nps: 0.5, innerDiameterMm: 13.84 },
        { nps: 0.75, innerDiameterMm: 18.88 },
        { nps: 1, innerDiameterMm: 24.3 },
        { nps: 1.25, innerDiameterMm: 32.5 },
        { nps: 1.5, innerDiameterMm: 38.14 },
        { nps: 2, innerDiameterMm: 49.22 },
        { nps: 2.5, innerDiameterMm: 58.98 },
        { nps: 3, innerDiameterMm: 73.66 },
        { nps: 3.5, innerDiameterMm: 85.44 },
        { nps: 4, innerDiameterMm: 97.18 },
        { nps: 5, innerDiameterMm: 122.24 },
        { nps: 6, innerDiameterMm: 146.36 },
        { nps: 8, innerDiameterMm: 193.7 },
        { nps: 10, innerDiameterMm: 247.7 },
        { nps: 12, innerDiameterMm: 298.5 },
        { nps: 14, innerDiameterMm: 330.2 },
        { nps: 16, innerDiameterMm: 381 },
        { nps: 18, innerDiameterMm: 431.6 },
        { nps: 20, innerDiameterMm: 482.6 },
        { nps: 24, innerDiameterMm: 584.6 },
    ],
};

/** List of all available pipe schedules */
export const PIPE_SCHEDULES = Object.keys(SCHEDULE_DATA) as PipeSchedule[];

const SCHEDULE_KEYS = new Set<PipeSchedule>(PIPE_SCHEDULES);

/**
 * Get all NPS entries for a given schedule.
 */
export function getScheduleEntries(schedule: PipeSchedule): ReadonlyArray<PipeScheduleEntry> {
    return SCHEDULE_DATA[schedule];
}

/**
 * Normalize a schedule string to a valid PipeSchedule type.
 * Returns undefined if not a valid schedule.
 */
export function normalizeSchedule(schedule: string | number | undefined | null): PipeSchedule | undefined {
    if (schedule === null || schedule === undefined) {
        return undefined;
    }
    const normalized = String(schedule).toUpperCase();
    return SCHEDULE_KEYS.has(normalized as PipeSchedule) ? normalized as PipeSchedule : undefined;
}

/**
 * Get the inner diameter (mm) for a given NPS and schedule.
 * Returns the nearest matching NPS if exact match is not found.
 * Returns undefined if schedule is invalid or no entries exist.
 */
export function getInnerDiameterMm(nps: number | undefined, schedule: string | PipeSchedule): number | undefined {
    if (nps === undefined || !Number.isFinite(nps)) {
        return undefined;
    }
    const normalizedSchedule = normalizeSchedule(schedule);
    if (!normalizedSchedule) {
        return undefined;
    }
    const entries = SCHEDULE_DATA[normalizedSchedule];
    if (!entries.length) {
        return undefined;
    }

    // First try exact match
    const exactMatch = entries.find(e => e.nps === nps);
    if (exactMatch) {
        return exactMatch.innerDiameterMm;
    }

    // Fall back to nearest NPS
    let best = entries[0]!;
    let bestDiff = Math.abs(best.nps - nps);
    for (let i = 1; i < entries.length; i += 1) {
        const entry = entries[i];
        const diff = Math.abs(entry.nps - nps);
        if (diff < bestDiff) {
            best = entry;
            bestDiff = diff;
        }
    }

    return best.innerDiameterMm;
}

/**
 * Get all available NPS sizes for a given schedule.
 */
export function getAvailableNpsSizes(schedule: string | PipeSchedule): number[] {
    const normalizedSchedule = normalizeSchedule(schedule);
    if (!normalizedSchedule) {
        return [];
    }
    return SCHEDULE_DATA[normalizedSchedule].map(e => e.nps);
}
