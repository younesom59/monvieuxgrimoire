const Book = require('../models/book');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // Importer la bibliothèque sharp

// Ajouter un livre avec une image
exports.addBook = async (req, res) => {
  try {
    console.log('Requête reçue pour ajouter un livre');
    
    // Vérifier la présence du fichier et du livre sous forme de chaîne de caractères
    if (!req.body.book || !req.file) {
      console.log('Livre ou image manquant');
      return res.status(400).json({ message: 'Le livre ou l\'image est manquant.' });
    }

    console.log('Fichier reçu :', req.file);
    console.log('Données du livre reçues :', req.body.book);

    // Parser le champ "book" qui est une chaîne de caractères en JSON
    const bookData = JSON.parse(req.body.book);

    console.log('Données du livre après parsing :', bookData);

    // Chemin vers le fichier image uploadé
    const uploadedImagePath = req.file.path;

    // Définir le nouveau nom et chemin pour l'image convertie
    const filename = `${req.file.filename.split('.')[0]}.webp`;
    const outputImagePath = path.join('uploads', filename);

    // Convertir et redimensionner l'image en WebP
    await sharp(uploadedImagePath)
      .resize({ width: 800 }) 
      .toFormat('webp')
      .toFile(outputImagePath);

    // Supprimer le fichier image original pour économiser de l'espace
    fs.unlinkSync(uploadedImagePath);

    // Créer l'objet livre à partir des données parsées
    const book = new Book({
      title: bookData.title,
      author: bookData.author,
      year: bookData.year,
      genre: bookData.genre,
      ratings: bookData.ratings || [],
      averageRating: bookData.averageRating || 0,
      imageUrl: `/uploads/${filename}`, // Utiliser le fichier converti
      userId: req.user.userId // Ajoute l'ID de l'utilisateur connecté
    });

    console.log('Livre en cours de sauvegarde :', book);

    // Sauvegarder le livre dans la base de données
    const newBook = await book.save();
    console.log('Livre sauvegardé avec succès !');

    res.status(201).json({ message: 'Livre ajouté avec succès !', book: newBook });
  } catch (err) {
    console.error('Erreur lors de l\'ajout du livre :', err); // Affiche l'erreur dans les logs
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
};

// Ajouter une note à un livre
exports.addRating = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const userId = req.user.userId;  // Utiliser l'userId du JWT

  console.log('Note reçue:', rating);
  console.log('User ID:', userId);

  if (!rating || rating < 0 || rating > 5) {
    return res.status(400).json({ message: 'La note doit être un nombre entre 0 et 5.' });
  }

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    const existingRating = book.ratings.find((rate) => rate.userId === userId);
    if (existingRating) {
      return res.status(400).json({ message: 'Vous avez déjà noté ce livre.' });
    }

    book.ratings.push({ userId, grade: rating });

    const totalRatings = book.ratings.length;
    const sumRatings = book.ratings.reduce((sum, rate) => sum + rate.grade, 0);
    book.averageRating = sumRatings / totalRatings;

    const updatedBook = await book.save();
    res.status(201).json(updatedBook);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout de la note.', error: err.message });
  }
};

// Récupérer tous les livres
exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer un livre par ID
exports.getBookById = async (req, res) => {
  const { id } = req.params;

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }
    // Vérifier le userId envoyé dans la réponse
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT - Modifier un livre (seul le propriétaire peut le modifier)
exports.updateBook = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // Le userId est extrait du token JWT

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    // Logs pour vérifier les IDs
    console.log('Book User ID:', book.userId);
    console.log('Connected User ID:', req.user.userId);

    // Vérifier si l'utilisateur connecté est bien le propriétaire du livre
    if (book.userId !== userId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier ce livre.' });
    }

    // Supprimer l'ancienne image si une nouvelle image est téléchargée
    if (req.file) {
      if (book.imageUrl) {
        const oldImagePath = path.join('uploads', path.basename(book.imageUrl));
        fs.access(oldImagePath, fs.constants.F_OK, (err) => {
          if (!err) {
            fs.unlink(oldImagePath, (err) => {
              if (err) {
                console.error('Erreur lors de la suppression de l\'ancienne image :', err);
              }
            });
          }
        });
      }

      // Traiter la nouvelle image
      const uploadedImagePath = req.file.path;
      const filename = `${req.file.filename.split('.')[0]}.webp`;
      const outputImagePath = path.join('uploads', filename);

      await sharp(uploadedImagePath)
        .resize({ width: 800 }) // Même taille que précédemment
        .toFormat('webp')
        .toFile(outputImagePath);

      fs.unlinkSync(uploadedImagePath);

      // Mettre à jour le chemin de l'image
      book.imageUrl = `/uploads/${filename}`;
    }

    // Mettre à jour les informations du livre
    book.title = req.body.title || book.title;
    book.author = req.body.author || book.author;
    book.year = req.body.year || book.year;
    book.genre = req.body.genre || book.genre;

    await book.save();
    res.status(200).json({ message: 'Livre modifié avec succès', book });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE - Supprimer un livre (seul le propriétaire peut le supprimer)
exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // Le userId est extrait du token JWT

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Livre non trouvé' });
    }

    // Logs pour vérifier les IDs
    console.log('Book User ID:', book.userId);
    console.log('Connected User ID:', req.user.userId);

    // Vérifier si l'utilisateur connecté est bien le propriétaire du livre
    if (book.userId !== userId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer ce livre.' });
    }

    // Supprimer l'image du livre s'il y en a une
    if (book.imageUrl) {
      const imagePath = path.join('uploads', path.basename(book.imageUrl));
      fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (!err) {
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error('Erreur lors de la suppression de l\'image:', err);
            }
          });
        }
      });
    }

    // Supprimer le livre de la base de données
    await book.deleteOne();
    res.status(200).json({ message: 'Livre supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Récupérer les 3 livres avec la meilleure note moyenne
exports.getBestRatings = async (req, res) => {
  try {
    // Récupérer les 3 livres ayant la meilleure note moyenne
    const books = await Book.find().sort({ averageRating: -1 }).limit(3);
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
