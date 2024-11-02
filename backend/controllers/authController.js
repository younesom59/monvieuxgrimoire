// Charger les dépendances
require('dotenv').config(); // Charger les variables d'environnement depuis .env
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const emailValidator = require('email-validator');
const PasswordValidator = require('password-validator');

// Charger la clé secrète JWT depuis les variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Créer un schéma pour valider les mots de passe sécurisés
const passwordSchema = new PasswordValidator();
passwordSchema
  .is().min(8)            // Minimum 8 caractères
  .is().max(100)          // Maximum 100 caractères
  .has().uppercase()      // au moins une majuscule
  .has().lowercase()      // au moins une minuscule
  .has().digits()         // u moins un chiffre
  .has().not().spaces();  // Ne doit pas contenir d'espaces

// Inscription d'un nouvel utilisateur
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  console.log("Email reçu :", email); // Log pour vérifier l'email reçu
  console.log("Mot de passe reçu :", password); // Log pour vérifier le mot de passe reçu

  // Vérification du format de l'email
  if (!emailValidator.validate(email)) {
    return res.status(400).json({ message: 'Adresse email non valide' });
  }

  // Vérification du mot de passe sécurisé
  if (!passwordSchema.validate(password)) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà avec cet email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    // Hacher le mot de passe avant de le sauvegarder
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur avec le mot de passe haché
    const user = new User({ email, password: hashedPassword });
    await user.save();

    // Générer un token JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

    // Retourner le token et le userId
    res.status(201).json({ userId: user._id, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log("Email reçu :", email); // Log pour vérifier l'email reçu
  console.log("Mot de passe reçu :", password); // Log pour vérifier le mot de passe reçu

  try {
    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Identifiants incorrects' });
    }

    // Comparer le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Identifiants incorrects' });
    }

    // Générer un token JWT avec le userId
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

    // Retourner le token et le userId
    res.status(200).json({ userId: user._id, token });
  } catch (err) {
    res.status(500).json({ message: 'Une erreur est survenue, veuillez réessayer plus tard.' });
  }
};
