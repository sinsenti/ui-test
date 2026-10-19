import styles from "./page.module.css";

const marginPaths = {
  form: [
    "M 24 0 C 10 180 40 270 26 420 S 12 690 28 790 C 42 875 18 925 24 1000",
    "M 1094 0 C 1110 170 1080 290 1095 440 S 1110 730 1092 820 C 1080 900 1100 940 1096 1000",
  ],
  catalog: [
    "M 24 0 C 35 120 8 190 22 290 C 40 410 56 380 48 320 C 40 270 14 360 22 480 S 40 700 24 820 S 10 940 26 1000",
    "M 1096 0 C 1082 160 1110 220 1096 350 S 1070 520 1085 600 C 1100 675 1110 600 1090 570 C 1064 530 1085 780 1098 860 S 1106 950 1092 1000",
  ],
  subscription: [
    "M 26 0 C 8 150 24 340 44 400 C 62 455 56 340 40 300 C 22 250 16 510 28 650 S 36 860 24 1000",
    "M 1092 0 C 1108 150 1090 280 1098 400 S 1110 660 1088 750 C 1074 815 1082 920 1096 1000",
  ],
  story: [
    "M 24 0 C 42 180 10 300 24 490 S 38 750 24 1000",
    "M 1096 0 C 1110 180 1082 250 1096 400 C 1110 560 1072 720 1070 650 C 1068 570 1116 680 1096 820 S 1080 940 1092 1000",
  ],
  delivery: [
    "M 24 0 C 6 180 38 260 24 420 S 10 620 30 740 C 48 850 58 780 44 740 C 26 680 16 910 26 1000",
    "M 1092 0 C 1110 170 1080 300 1094 460 S 1110 740 1096 1000",
  ],
  footer: [
    "M 26 0 C 36 200 12 450 26 650 S 110 960 240 900 C 350 845 375 965 490 920 S 665 890 770 940 C 900 995 1050 870 1130 910",
    "M 1096 0 C 1080 260 1112 510 1098 720",
  ],
};

export function MarginLines({ area }: { area: keyof typeof marginPaths }) {
  return <svg className={styles.marginLines} viewBox="0 0 1120 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {marginPaths[area].map((path) => <path key={path} d={path} vectorEffect="non-scaling-stroke" />)}
  </svg>;
}

export function HeroLines() {
  return <svg className={styles.heroLines} viewBox="0 0 1120 860" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M -18 2 C 45 26 130 28 146 74 C 164 126 62 152 45 238 C 20 364 34 556 40 662 C 44 712 40 732 42 743 C 54 713 64 678 76 702 C 92 736 104 746 116 728 C 134 704 146 724 166 738 C 190 760 216 734 242 744 C 270 755 282 769 300 747" vectorEffect="non-scaling-stroke" />
    <path d="M 46 199 C 50 146 66 88 78 70 C 88 56 64 156 82 138 C 102 118 96 86 108 113 L 118 138" vectorEffect="non-scaling-stroke" />
    <path d="M 1102 674 C 1130 726 1113 764 1070 787 C 1008 820 920 832 888 826 C 864 821 1032 776 1084 747 C 1124 724 1050 785 1018 806 C 980 831 924 851 968 842 C 1006 834 1088 802 1100 820" vectorEffect="non-scaling-stroke" />
  </svg>;
}
