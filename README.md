# CameraFirst Fitness

AI-powered fitness and nutrition platform with pose detection and personalized meal planning.

## 🎯 Project Overview

CameraFirst Fitness is a comprehensive health and wellness application that combines:
- **AI-powered pose detection** for real-time workout form analysis
- **Intelligent recipe recommendations** based on dietary goals
- **Personalized nutrition tracking** and meal planning
- **Progress monitoring** and gamification features

## 🏗️ Project Structure

```
CameraFirst-Fitness/
├── backend/                    # Spring Boot REST API
│   ├── src/                   # Java source code
│   ├── build.gradle.kts       # Gradle build configuration
│   ├── Dockerfile             # Backend container image
│   └── README.md              # Backend documentation
│
├── frontend/                   # React Native mobile app
│   ├── src/                   # TypeScript/React source code
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # App screens
│   │   ├── services/          # API and business logic
│   │   └── utils/             # Helper functions
│   ├── app.json               # Expo configuration
│   └── package.json           # npm dependencies
│
├── shared/                     # Shared code between projects
│   ├── types/                 # TypeScript type definitions
│   ├── constants/             # Shared constants
│   └── utils/                 # Shared utilities
│
├── infrastructure/             # Infrastructure as Code
│   ├── backend/               # Backend deployment configs
│   ├── frontend/              # Frontend deployment configs
│   ├── docker/                # Docker compose files
│   └── aws/                   # AWS configurations
│
├── scripts/                    # Utility scripts
│   ├── setup/                 # Environment setup scripts
│   ├── deployment/            # Deployment scripts
│   ├── database/              # Database management scripts
│   └── testing/               # Test automation scripts
│
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # System architecture docs
│   ├── deployment/            # Deployment guides
│   └── development/           # Development guides
│
└── .github/                    # GitHub workflows & configs
    └── workflows/             # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- **Java 17+** (for backend)
- **Node.js 18+** (for frontend)
- **PostgreSQL 14+** (for database)
- **Gradle** (included via wrapper)
- **Android Studio** or **Xcode** (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CameraFirst-Fitness.git
   cd CameraFirst-Fitness
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   bash scripts/setup/setup-database.sh
   ```

### Running Locally

#### Backend (Spring Boot)
```bash
# Run development server
npm run backend:run

# Or using Gradle directly
cd backend
./gradlew bootRun

# Backend will be available at http://localhost:8080
```

#### Frontend (React Native)
```bash
# Run Expo development server
npm run frontend:start

# Run on Android
npm run frontend:android

# Run on iOS
npm run frontend:ios

# Run on Web
npm run frontend:web
```

## 📦 Available Scripts

### Root Level
- `npm run setup` - Install all dependencies
- `npm test` - Run all tests
- `npm run clean` - Clean build artifacts

### Backend
- `npm run backend:build` - Build backend with Gradle
- `npm run backend:test` - Run backend tests
- `npm run backend:run` - Start backend dev server
- `npm run backend:jar` - Build executable JAR

### Frontend
- `npm run frontend:install` - Install frontend dependencies
- `npm run frontend:start` - Start Expo dev server
- `npm run frontend:android` - Run on Android
- `npm run frontend:ios` - Run on iOS
- `npm run frontend:web` - Export for web

## 🧪 Testing

```bash
# Run backend tests
cd backend
./gradlew test

# Run frontend tests
cd frontend
npm test

# Run integration tests
bash scripts/testing/test-api.sh
```

## 🚢 Deployment

### Backend Deployment (EC2)
```bash
# Build JAR
npm run backend:jar

# Deploy using script
bash scripts/deployment/start-app.sh
```

### Frontend Deployment (Expo/Web)
```bash
# Build for web
npm run frontend:web

# Deploy using script
bash scripts/deployment/rebuild-frontend.sh
```

See [deployment documentation](docs/deployment/) for detailed instructions.

## 📖 Documentation

- [API Documentation](docs/api/) - REST API endpoints and usage
- [Architecture](docs/architecture/) - System design and architecture
- [Deployment Guide](docs/deployment/) - Deployment instructions
- [Development Guide](docs/development/) - Development setup and conventions

## 🛠️ Technology Stack

### Backend
- **Spring Boot 3.2** - Application framework
- **PostgreSQL** - Primary database
- **Gradle** - Build tool
- **Spring Security** - Authentication & authorization
- **JPA/Hibernate** - ORM

### Frontend
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library

### Infrastructure
- **AWS EC2** - Application hosting
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Nginx** - Web server

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Pose detection powered by AI models
- Recipe data and nutrition information
- Open source community

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `/docs`
- Review closed issues for solutions

---

**Built with ❤️ by the CameraFirst Fitness Team**
