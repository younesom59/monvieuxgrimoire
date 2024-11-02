const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware'); 
const bookController = require('../controllers/bookController');

// Configuration de Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
// Routes pour les livres
router.get('/', bookController.getBooks); // Route publique pour afficher les livres
router.get('/:id', bookController.getBookById); // Route publique pour afficher un livre par ID

// Routes nécessitant une authentification
router.post('/', authMiddleware, upload.single('image'), bookController.addBook);
router.post('/:id/rating', authMiddleware, bookController.addRating);
router.put('/:id', authMiddleware, upload.single('image'), bookController.updateBook);
router.delete('/:id', authMiddleware, bookController.deleteBook);

module.exports = router;