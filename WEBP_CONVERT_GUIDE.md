# WEBP 일괄 변환 규칙 + fallback 운영 가이드 (88st.cloud)

## 1) 파일 네이밍 규칙 (중요)
카드 이미지는 아래처럼 **둘 다** 두는 걸 권장합니다.

- JPG(또는 PNG) 원본: `img/img1.jpg` ... `img/img9.jpg`
- WEBP 변환본: `img/img1.webp` ... `img/img9.webp`

페이지는 `<picture>`로 WEBP 우선 로드하고, WEBP가 없으면 JPG로 자동 fallback 됩니다.

> ✅ 따라서 *JPG를 삭제하지 말고* 같이 두면, 브라우저 호환성/에러가 가장 적습니다.

---

## 2) 권장 압축값 (실무용)
### 사진/배너류(카드 이미지)
- WEBP 품질(q): **75~82**
- 추천: `q=78` (대부분 용량/품질 밸런스 좋음)

### 로고/텍스트가 많은 이미지
- WEBP 품질(q): **80~88**
- 추천: `q=85` (문자 깨짐 최소화)

---

## 3) macOS / Linux (cwebp) 일괄 변환 예시
터미널에서 프로젝트 루트 기준:

```bash
# 카드 이미지 jpg -> webp (권장 기본값)
mkdir -p img_webp
for f in img/img*.jpg; do
  bn=$(basename "$f" .jpg)
  cwebp -q 78 -m 6 -af "$f" -o "img/${bn}.webp"
done
```

PNG가 섞여 있으면:

```bash
for f in img/img*.png; do
  bn=$(basename "$f" .png)
  cwebp -q 82 -m 6 -af "$f" -o "img/${bn}.webp"
done
```

---

## 4) Windows (권장 방법)
- 가장 쉬운 방법: **Squoosh.app**(웹) 또는 **XnConvert**(툴)
- 폴더 단위로 `img/img1~img9`를 WEBP로 Export
- Export 품질은 위 권장값 참고

---

## 5) 실제 “용량 줄이기” 핵심 팁
1) **리사이즈**가 먼저입니다  
   카드 이미지는 화면에서 보통 350~500px 폭이면 충분합니다.  
   원본이 1200px 이상이면 먼저 700~900px로 줄인 뒤 WEBP 변환하세요.

2) 무손실 PNG를 그대로 WEBP로 바꾸면 용량이 크게 안 줄 수도 있습니다.  
   텍스트/로고는 q를 올리고(85), 사진류는 q를 낮추는(78) 방식이 안정적입니다.

3) 목표 용량 가이드(대략)
- 카드 1장: **60~180KB** (대부분 충분)
- 로고: **30~90KB**

---

## 6) 업로드 체크리스트
- [ ] `img/img1.jpg` ~ `img/img9.jpg` 존재
- [ ] `img/img1.webp` ~ `img/img9.webp` 존재(권장)
- [ ] `img/logo.png` 또는 `img/logo.webp`(원하면) 존재
- [ ] 서버/호스팅 캐시가 강하면 “강력 새로고침” 후 확인
