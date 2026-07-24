# 가로수 이미지 자동 판별 조사 보고서

작성일: 2026-07-24
대상: 한국 가로수 공공데이터(약 25만 건)를 로드뷰 이미지와 대조 검증하기 위한 자동화 방법 조사

---

## 1. 결론 요약 — "존재 여부"와 "수종 판별"은 난이도가 근본적으로 다르다

| 과제 | 실현 가능성 | 근거가 되는 최고 성능 | 성격 |
|---|---|---|---|
| **(a) 나무 존재 여부** | **실용 가능** | 로드뷰 나무 탐지 **precision 92.2% / recall 82.4%** (YOLOv5x, 75만 장 학습) | vegetation 픽셀/바운딩박스 1개만 맞히면 됨. 계절 영향 작음(겨울에도 줄기·수관 골격 잔존) |
| **(b) 수종(species) 판별** | **25만 건 자동 검증용으로는 불가** | 8,363종 대상 최고 모델 **top-1 29.45%** (fine-tuned BioCLIP) | fine-grained 문제. 잎 클로즈업 없이 원거리 저해상도 로드뷰에서 미세 차이 구분 |
| (b') **속(genus) 판별** | 부분 가능, 편차 극심 | 100속 평균 **F1 0.55** (범위 0.06~0.88) | 학습 이미지 수에 성능이 강하게 의존 |
| (b'') **한국 상위 10종 한정 분류** | **가능성 있음 — 단 직접 학습·검증 필요** | 아래 8항 참조. **한국 수종 대상 실측 공개 수치는 확인 불가** | 클래스 수를 줄이면 성능 급상승 근거는 있으나 한국 실측치 없음 |

**핵심 격차:** 존재 여부와 수종 판별은 난이도가 한 자릿수 이상 차이난다. 존재 여부는 이미 90% 수준의 검증된 파이프라인이 존재하는 반면, 수종 판별은 fine-grained 문제이고 여기에 **겨울 낙엽 상태**가 겹치면 수피와 수형만 남아 사실상 판정이 성립하지 않는다.

**겨울 이미지 결정타:** 55종 실측 연구에서 시판 앱 6종 모두 **수피(bark) 사진 식별은 "완전히 신뢰 불가(wholly unreliable)"**로 판정(PlantSnap 속 수준 정확도 1.36%). 로드뷰의 상당수가 낙엽기라면 그 구간은 수종 검증이 아예 성립하지 않는다.

**실무 권고 2단계 전략:**
- 1단계(전수, 자동): 나무 존재 여부만 판정 → "수목 전무" 명백 오류 좌표만 플래그
- 2단계(표본, 반자동): 상위 10 수종 한정 파인튜닝 모델/Pl@ntNet API로 낮은 신뢰도 건만 사람 검토 대기열로
- 촬영 월 메타데이터로 낙엽기(11~4월) 이미지는 수종 판정 대상에서 제외 또는 신뢰도 대폭 하향
- AI 추정임을 표기하고, 공공데이터 원본 수정 근거로는 사용 금지

---

## 2. 선행연구별 실제 달성 정확도

### 2-1. Auto Arborist (Google/MIT, CVPR 2022) — 이 분야 기준 데이터셋
- 규모: 북미 23개 도시, **260만 그루, 344속(genus)**, 항공+스트리트뷰 910만 장
- 베이스라인(ResNet-101) class-averaged recall(AR):
  - 스트리트뷰 단독: **46.13% AR**
  - 항공영상 단독: **18.7% AR**
  - 융합(Mixture-of-Experts, 지역별 가중): **49.96% AR**
  - 도시 내(in-domain) 예: Vancouver **93.28% accuracy** ↔ 미학습 도시 일반화 시 급락
- **희소 클래스(<100 샘플)는 모든 도시에서 AR = 0.0** — 롱테일 완전 실패
- URL: https://openaccess.thecvf.com/content/CVPR2022/html/Beery_The_Auto_Arborist_Dataset_A_Large-Scale_Benchmark_for_Multiview_Urban_CVPR_2022_paper.html · https://google.github.io/auto-arborist/
- ※ AR 세부 수치(46.13/49.96/18.7)는 CVPR PDF 텍스트 추출 프록시로 읽은 값. 인용 전 원문 표 재확인 권장.

### 2-2. Continental-scale CV models (2025~2026) — 가장 직접적 참고
- URL: https://www.biorxiv.org/content/10.1101/2025.10.09.681424v2 · https://www.sciencedirect.com/science/article/pii/S2667393226000086
- 북미 23개 도시, **100속**, GSV + iNaturalist 이미지
- **탐지: YOLOv5x** (AutoArborist 75만 장 학습) → **precision 92.2%, recall 82.4%**
- **분류: EfficientNetV2-S** (약 84.9만 장, 속별 793~45,743장) → **100속 평균 F1 0.55**
  - 최고 Phoenix(대추야자) **F1 0.88** ↔ 최저 Carya(히코리) **F1 0.06**
  - 성능 ~ 학습 이미지 수 상관 **R² = 0.50 (p<0.001)**
- 실제 대장(inventory) 대조 매칭률: **67.1%** (도시별 67.4%±9.3%, 속별 50.9%±23.0%)
- → 25만 건 검증에 그대로 쓰면 약 3건 중 1건 매칭 실패

### 2-3. StreetTree 벤치마크 (2026) — 세계 최대 규모
- URL: https://arxiv.org/html/2602.19123
- 규모: 스트리트뷰 **1,220만 장 / 340만 그루 / 133개국 / 8,363종**
- Top-1 정확도 (전체 학습셋):

| 모델 | order | family | genus | **species** |
|---|---|---|---|---|
| Fine-tuned ViT | 38.47% | 30.85% | 23.67% | 15.51% |
| CLIP (zero-shot) | 23.50% | 18.82% | 10.91% | **7.59%** |
| Fine-tuned CLIP | 39.88% | 33.04% | 26.13% | 21.23% |
| Fine-tuned SigLIP | 42.14% | 35.53% | 30.24% | 27.25% |
| **Fine-tuned BioCLIP** | **45.45%** | **39.76%** | **36.31%** | **29.45%** |

- BioCLIP Top-5: order 81.12% / family 69.00% / genus 63.28% / **species 52.07%**
- 빈도별: 빈출종 30.26% → 보통종 27.15% → 희소종 20.60%
- 계절 분포: 봄 25.3% / 여름 31.6% / 가을 28% / **겨울 16.1%**. 저자들이 "계절에 따른 종내 변이"를 핵심 난제로 명시

### 2-4. Treepedia (MIT Senseable City Lab)
- **수종 분류가 아니라 녹시율(Green View Index) 산출 프로젝트.** GSV 파노라마 6장/지점 → pymeanshift 세그멘테이션 + Otsu 임계값으로 ExG 녹색 픽셀 추출 → GVI 0~100
- URL: https://github.com/mittrees/Treepedia_Public
- 즉 Treepedia는 (a) 존재/양 계열이며 (b) 수종 판별과 무관

### 2-5. "DeepStreet"
- 가로수 탐지/수종 분류 맥락의 "DeepStreet" 논문 → **확인 불가** (검색에서 무관한 결과만 반환)

### 2-6. 한국 대상 연구
- "가로수 수종 딥러닝 로드뷰 자동 판별" 한국어 검색 → 해당 주제 국내 논문 **확인 불가**. RISS/DBpia/KCI 직접 검색 필요

---

## 3. 낙엽기(leaf-off) 수종 분류 정확도 저하 근거

### 3-1. 계절 효과 직접 측정 (Continental-scale 논문, 2-2와 동일 출처)
- **Acer(단풍나무속)**: 여름(7~8월) 이미지가 겨울 이미지보다 **위양성·위음성 모두 감소**. 이 효과는 **월별 표본 수와 무관**했고 지역 전반 일관
- 다만 **다른 속들은 월별 차이가 통계적으로 유의하지 않음(p > 0.05)** — "겨울이면 무조건 실패"가 아니라 낙엽 형태 변화가 큰 속에서 특히 타격
- 종합: 겨울은 광범위한 낙엽·색소 활동 저하·활엽수 간 계절 신호 소실로 정보량이 가장 적은 계절
- URL: https://www.biorxiv.org/content/10.1101/2025.10.09.681424v2

### 3-2. 수피(bark) 단독 분류 — 연구는 있으나 조건이 다름
- **BarkNet 1.0**: 23종, 수피 근접 고해상도 23,000장 → 단일 crop **93.88%**, 개체별 다수결 **97.81%** — https://arxiv.org/abs/1803.00949
- **BarkNetV2 + ConvNeXt**: 33종 **97.61%** — https://www.mdpi.com/1999-4907/14/7/1292
- ⚠️ **결정적 제약:** 모두 수피 근접 고해상도 촬영 기준. 로드뷰는 도로 중앙에서 수~수십 미터 떨어진 저해상도 이미지이므로 이 성능은 **이전되지 않음**

### 3-3. 실제 앱으로 검증한 수피 성능 — 가장 직접적 반증
- URL: https://auf.isa-arbor.com/content/48/1/27 (*Arboriculture & Urban Forestry* 48(1):27)
- 55종, 잎/수피 사진 440장, 앱 6종(iNaturalist, PlantNet, LeafSnap, PlantSnap, PictureThis, Plant Identification)
- 속(genus) 수준: PictureThis 81.36%(최고), iNaturalist **잎 사진** 92.27%
- **수피 사진**: PlantSnap 속 정확도 **1.36%**. 논문 서술 — "잎 사진이 항상 수피 사진을 큰 폭으로 능가", 종 수준 수피 식별은 **"완전히 신뢰 불가(wholly unreliable)"**
- 논문 명시 제약: 낙엽수는 **11월~4월, 즉 1년의 6개월** 동안 잎이 없음

### 3-4. 수형(crown shape) 단독 분류
- 낙엽기 수형 단독 분류를 정량 평가한 연구 → **확인 불가**. StreetTree 논문이 계절 변이를 난제로 언급할 뿐, 수형 단독 성능 수치 제시 문헌 미발견

---

## 4. 사용 가능한 API/모델 비교표

| 항목 | 단가 | Rate limit | 한국 수종 커버리지 | 입력 이미지 요구사항 | 수종 판별 적합성 |
|---|---|---|---|---|---|
| **Pl@ntNet API** | 무료 500/day, €0 · Pro €1,000/년 + **€0.005/건**(≤3M), €0.004(>3M) · 비영리 무료(로고 의무) | 클라이언트당 **동시 20 요청**, Pro 1M req/day 보안쿼터 | 50,000+ 종. 동아시아 flora(`k-eastern-asia`) 자생 **4,899종**. ⚠️ 양버즘나무 등 식재 외래종 포함 여부 **확인 불가** | 요청당 최대 5장, JPG/PNG, 합계 50MB. organ 지정(leaf/flower/fruit/bark/auto, +habit 등 13종). 다중 organ 시 정확도 급상승, 원거리 단일샷은 광범위 추측만 | ✅ 상용 옵션 중 최선. 단 한국 수종 실측 확인 불가 |
| **iNaturalist CV** | — | — | — | — | ❌ **공개 CV API 없음.** 공개는 ~500 taxa small 모델뿐. 전체 모델 비공개(IP/사진권리) |
| **Google Cloud Vision** | 월 1,000 무료 후 Label **$1.50/1,000**, Object Localization **$2.25/1,000** | 표준 쿼터 | 종 전용 기능 없음 | 범용 이미지 | ❌ 수종 불가, "나무 있음" 라벨 정도만 |
| **Claude vision** (fable-5 등) | 이미지토큰 `⌈w/28⌉×⌈h/28⌉`. Haiku4.5 $1/$5, Opus4.8 $5/$25, Fable5 $10/$50 per MTok. **Batch 50% 할인** | API tier 한도 | — | 고해상도 티어 장변 2576px/최대 4,784토큰, 표준 1568px/1,568토큰. API당 최대 100~600장 | ⚠️ **수종 정확도 근거 확인 불가.** 대리지표(OpenPlant 1,167종): GPT-4V 42.6%, Gemini-2.0 49.7%, 전용 CNN 91% — VLM은 40%p+ 열세 |
| **BioCLIP 2** (오픈소스) | 자체 GPU 비용만 | — | TreeOfLife-200M 학습, 파인튜닝 가능 | 이미지 | ✅ StreetTree에서 파인튜닝 최고 성능. zero-shot 종 분류 BioCLIP 대비 +18.0%, CLIP 대비 +30.1% |
| **PlantCLEF 2024/25 ViT** (오픈소스) | 자체 GPU 비용만 | — | 개별식물 170만/140만 장 사전학습 ViT 공개 | 이미지 | ✅ 파인튜닝 백본으로 유용 |
| **AutoArborist 데이터셋** | 무료 | — | 북미 260만 그루 스트리트뷰 라벨 | — | 파인튜닝용 최적 소스(북미 종 기준) |

URL:
- Pl@ntNet 요금 https://my.plantnet.org/pricing · API https://my.plantnet.org/doc/api/identify · organ https://docs.plantnet.org/en/reference/organs/ · 동아시아 flora https://identify.plantnet.org/k-eastern-asia/identify
- iNaturalist https://www.inaturalist.org/blog/25510-vision-model-updates · https://github.com/inaturalist/model-files · https://forum.inaturalist.org/t/hidden-computer-vision-api/41775
- Google Vision https://cloud.google.com/vision/pricing
- Claude vision https://platform.claude.com/docs/en/build-with-claude/vision.md
- OpenPlant(VLM 대리지표) https://www.mdpi.com/2223-7747/15/5/727 · Plant.id 비교 https://www.kindwise.com/post/the-plant-identification-battle-gpt-4-vs-plant-id
- BioCLIP 2 https://huggingface.co/imageomics/bioclip-2 · https://imageomics.github.io/bioclip-2/
- PlantCLEF https://arxiv.org/abs/2509.15768 · https://arxiv.org/abs/2509.17602
- AutoArborist https://google.github.io/auto-arborist/

---

## 5. Semantic Segmentation(vegetation 클래스)으로 "나무 존재" 판별 — 신뢰도와 대표 모델

### 5-1. 대표 모델·성능
- Cityscapes 전체 mIoU: **Mask2Former-Large 82.42%** (SegFormer·MaskFormer 변형 대비 우위)
- vegetation 클래스 단독: Mask2Former IoU **72.63~76.05%**, 어안 이미지 F1 0.8288(SegFormer 0.814) — https://doi.org/10.3390/sym18010068 (※ vegetation 세부수치는 검색 스니펫 기반, 원문 표 직접 미확인)
- **GVI ↔ 수작업 측정 상관계수**: PSPNet **r=0.91**, SegNet **r=0.899/0.992**, FCN-8s **r=0.90**, DeepLab **r=0.9552** — https://pmc.ncbi.nlm.nih.gov/articles/PMC11014299/

### 5-2. 신뢰도의 함정 (반드시 고려)
1. **vegetation ≠ 가로수.** Cityscapes/ADE20K vegetation 클래스는 관목·덩굴·정원수·가로수를 구분하지 않음. "vegetation 픽셀 존재"는 "이 좌표에 가로수 1주" 증거가 못 됨
2. **terrain 클래스 혼입 과대추정.** DeepLabv3+ Cityscapes에서 terrain(잔디+맨흙+모래)을 식생에 넣으면 과대추정. vegetation 클래스는 비녹색 줄기·가지도 포함 — https://www.sciencedirect.com/science/article/abs/pii/S161886672300016X
3. **좌표 정합 문제.** 공공데이터 좌표와 로드뷰 촬영 위치·방위각 불일치 시 탐지가 맞아도 매칭 실패(2-2 논문 매칭률 67.1%의 주요 원인)

### 5-3. 권고
"가로수 존재 여부"는 **탐지(YOLO/Mask R-CNN) + GVI 보조**의 2중 신호로 판정하고, 세그멘테이션 단독 GVI는 "이 구간에 수목 전무"라는 명백한 오류 좌표 필터링 용도로만 사용하는 것이 안전. 이 용도라면 25만 건 전수 적용 현실적.

---

## 6. 처리량·비용 추정용 단가

| 방식 | 단가 근거 | 25만 건 추정 |
|---|---|---|
| Pl@ntNet Pro | €1,000/년 + €0.005/건 | **≈ €2,250** (동시요청 20개 제한이 처리시간 제약) |
| Pl@ntNet 무료 | 500/day | €0, 그러나 약 500일 |
| Pl@ntNet 비영리 | 승인 시 무료 + 로고 의무 | €0 (승인 절차) |
| Google Vision Label | $1.50/1,000 | $375 (수종 불가) |
| Google Vision Object Localization | $2.25/1,000 | $562.50 (수종 불가) |
| Claude Haiku 4.5 | $1/$5 per MTok, 이미지 ≈1,036 tok | **≈ $460** (배치 $230) |
| Claude Opus 4.8 | $5/$25 per MTok | ≈ $2,300 (배치 $1,150) |
| Claude Fable 5 | $10/$50 per MTok | ≈ $4,600 (배치 $2,300) |
| 자체 GPU 세그멘테이션 | SegFormer-B0 **48 FPS**(Cityscapes 1024×2048, TensorRT 미적용) | 25만 장 ÷ 48fps ≈ **1.5시간 / GPU 1장**, 전기·인스턴스 비용만 |
| 자체 GPU 분류 | EfficientNetV2-S 등, 세그멘테이션보다 빠름 | 수십 분 수준 |

- Claude 25만 건 개략 추정: 1024×768 ≈1,036 이미지토큰 + 프롬프트 300 + 출력 100 가정
- SegFormer 속도: https://arxiv.org/pdf/2105.15203 (B0 71.9% mIoU @ 48 FPS). 다른 실험(RTX 3090, 다른 해상도)은 8.8 FPS/76.2% — 해상도·구현에 따라 5배+ 편차, 자체 벤치마크 필수
- Claude 요금 https://platform.claude.com/docs/en/build-with-claude/vision.md, Batch 50% 할인
- **비용은 어느 방식이든 큰 장벽 아님. 병목은 비용이 아니라 정확도.**

---

## 7. 추가 질문 — 상위 10종 96% 커버 시 10-클래스 분류의 현실적 기대 정확도

대상 분포: 은행나무 42%, 양버즘나무 27%, 느티나무 9%, 벚나무류 5%, 메타세쿼이아 2%, 회화나무 2%, 소나무 1%, 이팝나무 1% (+ 나머지 2종으로 96%)

### 7-0. 가장 중요한 전제
**한국 가로수 상위 10종을 로드뷰 이미지로 분류한 실측 정확도 공개 수치는 존재하지 않는다 — 확인 불가.** 아래는 인접 연구 근거로부터의 *추정 범위*이며, 확정 수치가 아니다. 반드시 파일럿으로 검증해야 한다.

### 7-1. 추정을 뒷받침하는 근거
1. **클래스 수 축소는 정확도를 크게 올린다.** StreetTree에서 동일 모델의 top-1이 species 29.45% → genus 36.31% → family 39.76% → order 45.45%로 상승(2-3). 8,363종 → 10종으로 줄이면 상승폭은 이보다 훨씬 크다.
2. **클래스가 소수이고 형태가 뚜렷하면 90%+ 가능.** BarkNet 23종 93~97%(단 근접 고해상도, 2-2), 앱 잎 사진 iNaturalist 속 92.27%(2-3). 단 로드뷰 원거리·저해상도라는 조건 저하 반영 필요.
3. **다수결(majority-class) 베이스라인만으로 42%.** 은행나무가 42%이므로 "전부 은행나무로 찍기"만 해도 정확도 42%. 어떤 모델이든 이보다 높아야 의미 있음.
4. **은행나무·메타세쿼이아·소나무는 수형/잎이 매우 독특**해 계절 무관하게 잘 분리될 가능성이 높음(정성적 판단). 반면 벚나무류·느티나무·회화나무·이팝나무는 낙엽기 활엽수로 상호 혼동 위험이 큼(3-1의 활엽수 계절 신호 소실 근거).

### 7-2. 현실적 기대 정확도 (추정 범위, 확인 불가 전제)
- **잎-on(생육기) 이미지 한정, 상위 10종 파인튜닝:** **top-1 약 80~90%** 도달 가능성 있음. 근거: 소수 클래스·독특한 형태 + BarkNet/앱 잎 사진 수치에서의 유추. 단 이 수치는 한국 데이터 직접 검증 전까지 확정 불가.
- **낙엽기(leaf-off) 활엽수 포함 전체:** **크게 저하**. 벚나무류·느티나무·회화나무·이팝나무 간 상호 혼동으로 활엽수 그룹 정확도가 낮아짐(3-1, 3-3의 수피 "신뢰 불가" 판정). 이 구간은 별도 신뢰도 하향 또는 판정 제외 권장.
- **가중 정확도의 왜곡 주의:** 은행나무 42% + 양버즘나무 27% = 69%가 두 종에 집중. 이 두 종만 잘 맞혀도 전체 가중 정확도는 높게 보이지만, 소수 종(메타세쿼이아·회화나무·소나무·이팝나무 각 1~2%)은 학습 샘플 부족으로 F1이 매우 낮을 수 있음(2-2의 R²=0.50, 학습량 의존 근거 / AutoArborist 희소 클래스 AR=0.0 근거). **매크로 F1(클래스 평균)은 가중 정확도보다 훨씬 낮게 나올 것.**

### 7-3. 결론
- **낙관 시나리오(잎-on, 충분한 한국 라벨 확보, 파인튜닝):** 전체 가중 top-1 80~90%대 가능성 — 단 **추정이며 확인 불가**
- **보수 시나리오(낙엽기 포함, 소수 종 라벨 부족):** 소수 활엽수 종의 매크로 F1은 크게 낮음. 가중 정확도는 다수 2종에 의해 부풀려질 수 있음
- **필수 조치:** ① 계절 층화(잎-on/off 분리 평가) ② 종별 최소 수백~수천 장 한국 라벨 확보 ③ 매크로 F1과 가중 정확도 병기 ④ 종별 신뢰도 임계값으로 낮은 확신 건 사람 검토
- 근거 URL: https://arxiv.org/html/2602.19123 · https://www.biorxiv.org/content/10.1101/2025.10.09.681424v2 · https://arxiv.org/abs/1803.00949 · https://auf.isa-arbor.com/content/48/1/27 · https://openaccess.thecvf.com/content/CVPR2022/html/Beery_The_Auto_Arborist_Dataset_A_Large-Scale_Benchmark_for_Multiview_Urban_CVPR_2022_paper.html

---

## 8. 확인 불가 항목 (추측 금지 대상)

- "DeepStreet" 명칭의 가로수 수종 분류 논문 — 해당 주제 논문 미발견
- 한국 가로수 대상 로드뷰 자동 수종 판별 국내 논문 — 미발견(RISS/DBpia/KCI 직접 검색 필요)
- Claude 계열 모델의 식물/수종 분류 벤치마크 수치 — 공개 자료 없음
- Pl@ntNet의 한국 주요 가로수 수종별 실측 정확도 — 없음
- Pl@ntNet 동아시아 flora가 식재 외래종(양버즘나무·메타세쿼이아 등) 포함 여부 — 확인 불가
- 낙엽기 수형(crown shape) 단독 분류 정량 성능 — 미발견
- **한국 상위 10종 로드뷰 분류의 실측 정확도** — 없음 (7항 수치는 인접 연구 기반 추정)
- 네이버 로드뷰 이미지 대량 수집·처리의 이용약관 적법성 — 이번 조사 범위 밖, 구현 전 별도 확인 필수
- Cityscapes vegetation 클래스별 IoU 세부 수치 — 원문 표 직접 미확인(검색 스니펫 기반)
