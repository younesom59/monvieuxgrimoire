const express = require('express');
const cors = require('cors'); // Import de CORS
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes'); // Import des routes d'authentification
const bookRoutes = require('./routes/bookRoutes'); // Import des routes pour les livres
const authMiddleware = require('./middlewares/authMiddleware'); // Import du middleware d'authentification
const multer = require('multer'); // Import de Multer
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

// Utiliser CORS pour autoriser les requêtes provenant de localhost:3000
app.use(cors({ origin: 'http://localhost:3000' }));

// Middleware pour parser les corps de requêtes JSON
app.use(express.json());

// Servir les images depuis le dossier "uploads"
app.use('/uploads', express.static('uploads'));

// Configuration de Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Stockage des fichiers dans le dossier "uploads"
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Renommer les fichiers avec un timestamp pour éviter les conflits
  }
});

const upload = multer({ storage: storage });

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/monvieuxgrimoire', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Impossible de se connecter à MongoDB', err));

// Appliquer le rate limit à toutes les routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par IP toutes les 15 minutes
    message: "Trop de requêtes depuis cette IP, réessayez dans 15 minutes."
});

app.use(limiter);

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Routes pour les livres (sans authentification pour les requêtes GET)
app.use('/api/books', bookRoutes);

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});
