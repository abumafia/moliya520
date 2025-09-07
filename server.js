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

// Yangi Post modeli (sport to'garaklari uchun)
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  comments: [{
    name: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  applications: [{
    // Talaba ma'lumotlari
    photo: { type: String, required: true },
    fullName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    idNumber: { type: String, required: true },
    jshrNumber: { type: String, required: true },
    // Qo'shimcha ma'lumotlar
    phone: { type: String, required: true },
    address: { type: String },
    experience: { type: String },
    achievements: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
});

const Post = mongoose.model('Post', postSchema);

// Talaba modeli (asosiy talabalar ro'yxati uchun)
const studentSchema = new mongoose.Schema({
  // Shaxsiy ma'lumotlar
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  birthDate: { type: Date, required: true },
  permanentAddress: { type: String, required: true },
  temporaryAddress: { type: String },
  
  // Ota-ona ma'lumotlari
  fatherName: { type: String },
  motherName: { type: String },
  
  // To'lov va identifikatsiya
  paymentType: { type: String, required: true },
  nationality: { type: String, required: true },
  idNumber: { type: String, required: true },
  jshrNumber: { type: String, required: true },
  idIssueInfo: { type: String, required: true },
  privilegedAdmission: { type: Boolean, default: false },
  
  // Aloqa ma'lumotlari
  studentPhone: { type: String, required: true },
  fatherPhone: { type: String },
  fatherJob: { type: String },
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

// Asosiy sahifa (sport to'garaklari)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Talabalar ro'yxati sahifasi
app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'students.html'));
});

// Admin sahifasi (sport to'garaklari boshqaruvi)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Talabalar admin sahifasi
app.get('/students-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'students-admin.html'));
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

// Talabani o'chirish
app.delete('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Talaba topilmadi' });
    }
    
    // Rasm faylini o'chirish
    if (student.photo) {
      const photoPath = path.join(__dirname, 'public', student.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Talaba ma\'lumotlari muvaffaqiyatli o\'chirildi' 
    });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Talabani o\'chirishda xatolik yuz berdi' 
    });
  }
});

// Yangi post yaratish (sport to'garaklari uchun)
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    const postData = {
      title: req.body.title,
      description: req.body.description,
      image: req.file ? '/uploads/' + req.file.filename : ''
    };
    
    const newPost = new Post(postData);
    await newPost.save();
    
    res.json({ 
      success: true, 
      message: 'Post muvaffaqiyatli yaratildi!',
      postId: newPost._id 
    });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Post yaratishda xatolik yuz berdi' 
    });
  }
});

// Barcha postlarni olish (sport to'garaklari uchun)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Postlarni olishda xatolik' });
  }
});

// ID bo'yicha postni olish (sport to'garaklari uchun)
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post topilmadi' });
    }
    res.json(post);
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Postni olishda xatolik' });
  }
});

// Postga like qo'shish (sport to'garaklari uchun)
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post topilmadi' });
    }
    
    post.likes += 1;
    await post.save();
    
    res.json({ success: true, likes: post.likes });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Like qo\'shishda xatolik' });
  }
});

// Postga comment qo'shish (sport to'garaklari uchun)
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post topilmadi' });
    }
    
    post.comments.push({
      name: req.body.name,
      text: req.body.text
    });
    
    await post.save();
    
    res.json({ success: true, comments: post.comments });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ message: 'Comment qo\'shishda xatolik' });
  }
});

// Postga ariza qo'shish (sport to'garaklari uchun)
app.post('/api/posts/:id/apply', upload.single('photo'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post topilmadi' });
    }
    
    const applicationData = {
      photo: req.file ? '/uploads/' + req.file.filename : '',
      fullName: req.body.fullName,
      birthDate: req.body.birthDate,
      idNumber: req.body.idNumber,
      jshrNumber: req.body.jshrNumber,
      phone: req.body.phone,
      address: req.body.address,
      experience: req.body.experience,
      achievements: req.body.achievements
    };
    
    post.applications.push(applicationData);
    await post.save();
    
    res.json({ 
      success: true, 
      message: 'Arizangiz muvaffaqiyatli qabul qilindi!'
    });
  } catch (error) {
    console.error('Xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ariza yuborishda xatolik yuz berdi' 
    });
  }
});

// Serverni ishga tushirish
app.listen(port, () => {
  console.log(`Server ${port}-portda ishga tushdi`);
});