const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('email-validator');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email est requis'],
    unique: true,
    validate: {
      validator: function(v) {
        return validator.validate(v);
      },
      message: props => `${props.value} n'est pas une adresse email valide !`
    }
  },
  password: { type: String, required: [true, 'Mot de passe est requis'] }
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
