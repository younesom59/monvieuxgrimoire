const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('email-validator'); // Importer le validateur

// Schéma utilisateur avec validation de l'email
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    validate: {
      validator: function(v) {
        return validator.validate(v);  // Utilise le validateur d'email
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: { type: String, required: [true, 'Password is required'] }
});

// Hash le mot de passe avant de sauvegarder l'utilisateur
userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return next(err);
  }
});

// Comparer les mots de passe
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
