const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// MongoDB ulanish
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://apl:apl00@gamepaymentbot.ffcsj5v.mongodb.net/moliya520-25?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Talaba modeli
const studentSchema = new mongoose.Schema({
  // Shaxsiy ma'lumotlar
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  birthDate: { type: Date, required: true },
  permanentAddress: { type: String, required: true },
  temporaryAddress: { type: String },
  
  // To'lov va identifikatsiya
  paymentType: { type: String, required: true },
  nationality: { type: String, required: true },
  idNumber: { type: String, required: true },
  jshrNumber: { type: String, required: true },
  idIssueInfo: { type: String, required: true },
  privilegedAdmission: { type: Boolean, default: false },
  
  // Aloqa ma'lumotlari
  studentPhone: { type: String, required: true },
    fatherName: { type: String }, // Yangi: Otasining ismi
  fatherPhone: { type: String },
  fatherJob: { type: String },
    motherName: { type: String }, // Yangi: Onasining ismi
  motherPhone: { type: String },
  motherJob: { type: String },
  
  // Qo'shimcha ma'lumotlar
  maritalStatus: { type: String },
  certificates: { type: String },
  interests: { type: String },
  graduatedSchool: { type: String },
  youthRegistry: { type: Boolean, default: false },
  kindnessHouse: { type: Boolean, default: false },
  divorcedParents: { type: Boolean, default: false },
  womenRegistry: { type: Boolean, default: false },
  ironRegistry: { type: Boolean, default: false },
  lostBreadwinner: { type: Boolean, default: false },
  trueOrphan: { type: Boolean, default: false },
  guardianInfo: { type: String },
  
  // Rasm
  photo: { type: String, required: true },
  
  // Qo'shimcha maydonlar
  createdAt: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

// Middleware sozlamalari
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Rasm yuklash sozlamalari
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllarini yuklash mumkin!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Asosiy sahifa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin sahifasi
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Talaba ma'lumotlarini qabul qilish
app.post('/submit-student', upload.single('photo'), async (req, res) => {
  try {
    // Boolean qiymatlarni to'g'rilash
    const booleanFields = [
      'privilegedAdmission', 'youthRegistry', 'kindnessHouse', 
      'divorcedParents', 'womenRegistry', 'ironRegistry', 
      'lostBreadwinner', 'trueOrphan'
    ];
    
    const studentData = { ...req.body };
    
    booleanFields.forEach(field => {
      studentData[field] = studentData[field] === 'on';
    });

    // Rasm fayl nomini saqlash
    studentData.photo = req.file ? '/uploads/' + req.file.filename : '';
    
    // Ma'lumotlarni bazaga saqlash
    const newStudent = new Student(studentData);
    await newStudent.save();
    
    res.json({ 
      success: true, 
      message: 'Ma\'lumotlar muvaffaqiyatli saqlandi!',
      studentId: newStudent._id 
    });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ma\'lumotlarni saqlashda xatolik yuz berdi' 
    });
  }
});

// Barcha talabalarni olish
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Ma\'lumotlarni olishda xatolik' });
  }
});

// ID bo'yicha talabani olish
app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Talaba topilmadi' });
    }
    res.json(student);
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Ma\'lumotlarni olishda xatolik' });
  }
});

// Serverni ishga tushirish
app.listen(port, () => {
  console.log(`Server ${port}-portda ishga tushdi`);
});