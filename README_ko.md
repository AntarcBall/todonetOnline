# TodoNet Online

웹 기반 인터랙티브 네트워크 시각화 및 관리 도구

## 🔒 보안 안내

이 저장소는 배포 전 반드시 환경설정이 필요합니다.

### 필수 환경 변수

루트 디렉토리에 `.env` 파일을 생성하고 아래와 같이 입력하세요:

```env
# Gemini AI API Key (Google AI Studio에서 발급)
GEMINI_API_KEY=여기에_본인_키_입력

# Firebase 서비스 계정 (서버용)
FIREBASE_SERVICE_ACCOUNT_JSON='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n여기에_개인키_입력\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "your-client-cert-url"
}'

# GCP 배포용 환경 변수
GCP_PROJECT=your-gcp-project-id
SECRET_ID=your-secret-manager-secret-id
```

### Firebase 설정

`src/js/utils/firebase-config.js` 파일에 본인 Firebase 프로젝트의 웹 설정값을 입력하세요:

1. Firebase 콘솔 → 프로젝트 설정 → 일반
2. "내 앱" 섹션에서 웹 앱 선택 또는 새로 생성
3. 구성 값 복사 후 붙여넣기

### 보안 유의사항

- 실제 API 키, 서비스 계정 파일은 절대 커밋하지 마세요
- `.env` 파일은 이미 `.gitignore`에 포함되어 있습니다
- Firebase 웹 설정 값은 공개되어도 무방하지만, 데이터 접근은 보안 규칙으로 제어해야 합니다
- 서버용 서비스 계정 키는 외부에 노출되지 않도록 주의하세요

## 🚀 시작하기

### 사전 준비
- Node.js (v14 이상)
- Firebase 프로젝트 (Authentication, Firestore 활성화)
- Google AI Studio 계정 (Gemini API)

### 설치 방법
1. 저장소 클론
2. 의존성 설치:
   ```bash
   npm install
   ```
3. 환경 변수 파일 작성 (위 참고)
4. Firebase 설정값 입력
5. 서버 실행:
   ```bash
   node server.js
   ```

### Firebase 세팅
1. https://console.firebase.google.com 에서 프로젝트 생성
2. 인증 → Google 로그인 활성화
3. Firestore 데이터베이스 활성화
4. 서비스 계정 생성 및 키 발급
5. Firestore 보안 규칙 설정

### 배포 시 유의사항
- 민감 정보는 환경 변수 또는 Google Secret Manager로 관리
- 호스팅 플랫폼 환경 변수 설정
- Firebase 보안 규칙 재확인
- 인증 및 DB 연동 테스트

## 📁 프로젝트 구조
```
├── src/
│   ├── js/
│   │   ├── app/          # 앱 로직
│   │   ├── ui/           # UI 컴포넌트
│   │   ├── utils/        # 유틸리티 및 설정
│   │   ├── auth.js       # 인증 처리
│   │   └── main.js       # 메인 엔트리
│   ├── css/              # 스타일시트
│   ├── assets/           # 정적 리소스
│   └── index.html        # 메인 HTML
├── server.js             # Express 서버
├── package.json          # 의존성
└── README_ko.md          # 이 파일
```

## 🔧 주요 기능
- 네트워크 시각화 및 편집
- 실시간 협업
- Firebase 인증
- Firestore 연동
- Gemini API 기반 AI 기능

## 📝 라이선스

[라이선스 내용을 여기에 작성하세요]

## 🤝 기여 방법

[기여 가이드라인을 여기에 작성하세요]

## ⚠️ 주의

이 프로젝트는 학습/데모 목적입니다. 실제 서비스 배포 전 반드시 보안 점검을 하세요.
