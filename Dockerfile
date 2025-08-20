# 1. 베이스 이미지 선택
FROM node:18-slim

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. package.json과 package-lock.json 복사
COPY package*.json ./

# 4. 프로덕션용 종속성만 설치
RUN npm install --only=production

# 5. 소스 코드와 서비스 계정 키 복사
# .dockerignore 파일에 의해 node_modules 등은 제외됩니다.
COPY . .

# 6. 애플리케이션이 수신할 포트 명시
EXPOSE 8080

# 7. 서버 실행
CMD [ "node", "server.js" ]
