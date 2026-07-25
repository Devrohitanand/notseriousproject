/*
  STOLEBOOKS – Complete Seed Script
*/
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stolebooks';

//  Schemas (same as server.js) 
const UserSchema = new mongoose.Schema({
  full_name:   { type: String, required: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  phone:       { type: String, default: '' },
  role:        { type: String, enum: ['user', 'admin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  avatar:      { type: String, default: '' },
  default_address: { type: String, default: '' },
}, { timestamps: true });

const BookSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  author:          { type: String, required: true },
  price:           { type: Number, required: true },
  original_price:  { type: Number },
  rating:          { type: Number, default: 4.0 },
  reviews_count:   { type: Number, default: 0 },
  category:        { type: String, required: true },
  cover_image:     { type: String, default: '' },
  description:     { type: String, default: '' },
  isbn:            { type: String, default: '' },
  pages:           { type: Number, default: 0 },
  publisher:       { type: String, default: '' },
  language:        { type: String, default: 'English' },
  stock:           { type: Number, default: 100 },
  is_bestseller:   { type: Boolean, default: false },
  is_new_arrival:  { type: Boolean, default: false },
  is_featured:     { type: Boolean, default: false },
  is_trending:     { type: Boolean, default: false },
  discount_percent:{ type: Number, default: 0 },
  tags:            [String],
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Book = mongoose.model('Book', BookSchema);

// Book Data (real Open Library cover image URLs)
// Images from covers.openlibrary.org 
const books = [
  // BESTSELLERS 
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    price: 399, original_price: 699,
    rating: 4.8, reviews_count: 52000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
    description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones. The #1 New York Times bestseller.',
    pages: 320, publisher: 'Avery', language: 'English', stock: 200,
    is_bestseller: true, is_trending: true, discount_percent: 43,
    tags: ['habits', 'productivity', 'self-improvement', 'bestseller'],
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    price: 299, original_price: 499,
    rating: 4.7, reviews_count: 98000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg',
    description: 'A magical story about following your dreams and listening to your heart.',
    pages: 197, publisher: 'HarperOne', stock: 300,
    is_bestseller: true, is_featured: true, discount_percent: 40,
    tags: ['fiction', 'inspirational', 'classic', 'bestseller'],
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert T. Kiyosaki',
    price: 349, original_price: 599,
    rating: 4.6, reviews_count: 75000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg',
    description: 'What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not!',
    pages: 336, publisher: 'Plata Publishing', stock: 150,
    is_bestseller: true, is_trending: true, discount_percent: 42,
    tags: ['finance', 'money', 'investing', 'bestseller'],
  },
  {
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    price: 379, original_price: 599,
    rating: 4.7, reviews_count: 45000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
    description: 'Timeless lessons on wealth, greed, and happiness.',
    pages: 256, publisher: 'Harriman House', stock: 180,
    is_bestseller: true, is_featured: true, discount_percent: 37,
    tags: ['finance', 'psychology', 'money', 'investing'],
  },
  {
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    price: 199, original_price: 399,
    rating: 4.5, reviews_count: 110000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781585424337-L.jpg',
    description: 'The classic guide to personal achievement and financial success.',
    pages: 320, publisher: 'TarcherPerigee', stock: 250,
    is_bestseller: true, discount_percent: 50,
    tags: ['self-help', 'success', 'motivation', 'classic'],
  },

  // NEW ARRIVALS
  {
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
    price: 549, original_price: 799,
    rating: 4.6, reviews_count: 32000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781649374042-L.jpg',
    description: 'A fantasy romance set in a war college for dragon riders.',
    pages: 528, publisher: 'Red Tower Books', stock: 120,
    is_new_arrival: true, is_trending: true, discount_percent: 31,
    tags: ['fantasy', 'romance', 'dragons', 'new'],
  },
  {
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    author: 'Gabrielle Zevin',
    price: 499, original_price: 699,
    rating: 4.4, reviews_count: 18000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg',
    description: 'A novel about love, art, and video games over 30 years.',
    pages: 401, publisher: 'Knopf', stock: 90,
    is_new_arrival: true, is_featured: true, discount_percent: 29,
    tags: ['fiction', 'friendship', 'art', 'new arrival'],
  },
  {
    title: 'Intermezzo',
    author: 'Sally Rooney',
    price: 479, original_price: 699,
    rating: 4.3, reviews_count: 9800,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780374611606-L.jpg',
    description: 'The new novel by the author of Normal People.',
    pages: 448, publisher: 'Farrar, Straus and Giroux', stock: 100,
    is_new_arrival: true, discount_percent: 31,
    tags: ['literary fiction', 'contemporary', 'new'],
  },

  // FICTION
  {
    title: 'Harry Potter and the Philosopher\'s Stone',
    author: 'J.K. Rowling',
    price: 399, original_price: 599,
    rating: 4.9, reviews_count: 250000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780439708180-L.jpg',
    description: 'The magical story that started it all. Harry Potter discovers he is a wizard.',
    pages: 309, publisher: 'Scholastic', stock: 500,
    is_bestseller: true, is_featured: true, discount_percent: 33,
    tags: ['fantasy', 'magic', 'harry potter', 'classic', 'kids'],
  },
  {
    title: 'The Midnight Library',
    author: 'Matt Haig',
    price: 349, original_price: 549,
    rating: 4.4, reviews_count: 28000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg',
    description: 'Between life and death there is a library with books of every life you could have lived.',
    pages: 304, publisher: 'Viking', stock: 150,
    is_trending: true, discount_percent: 36,
    tags: ['fiction', 'philosophy', 'mental health'],
  },
  {
    title: 'It Ends with Us',
    author: 'Colleen Hoover',
    price: 349, original_price: 499,
    rating: 4.5, reviews_count: 65000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781501156700-L.jpg',
    description: 'A brave and heartbreaking novel about love and its complications.',
    pages: 384, publisher: 'Atria Books', stock: 200,
    is_bestseller: true, is_trending: true, discount_percent: 30,
    tags: ['romance', 'contemporary fiction', 'colleen hoover'],
  },
  {
    title: 'The Girl with the Dragon Tattoo',
    author: 'Stieg Larsson',
    price: 379, original_price: 599,
    rating: 4.6, reviews_count: 42000,
    category: 'Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780307949486-L.jpg',
    description: 'A gripping crime thriller about a journalist and a hacker solving a 40-year mystery.',
    pages: 672, publisher: 'Knopf', stock: 130,
    is_featured: true, discount_percent: 37,
    tags: ['thriller', 'mystery', 'crime', 'bestseller'],
  },

  // NON-FICTION 
  {
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    price: 449, original_price: 699,
    rating: 4.7, reviews_count: 88000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',
    description: 'How did Homo sapiens become the dominant species on Earth?',
    pages: 464, publisher: 'Harper', stock: 200,
    is_bestseller: true, is_featured: true, discount_percent: 36,
    tags: ['history', 'anthropology', 'science', 'bestseller'],
  },
  {
    title: 'The Power of Now',
    author: 'Eckhart Tolle',
    price: 299, original_price: 499,
    rating: 4.5, reviews_count: 54000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781577314806-L.jpg',
    description: 'A guide to spiritual enlightenment and living in the present moment.',
    pages: 236, publisher: 'New World Library', stock: 180,
    is_bestseller: true, discount_percent: 40,
    tags: ['spirituality', 'mindfulness', 'self-help'],
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    price: 399, original_price: 599,
    rating: 4.7, reviews_count: 38000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg',
    description: 'A memoir about a woman who grows up in a survivalist family and educates herself.',
    pages: 352, publisher: 'Random House', stock: 140,
    is_featured: true, is_trending: true, discount_percent: 33,
    tags: ['memoir', 'education', 'family', 'award winner'],
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    price: 429, original_price: 699,
    rating: 4.5, reviews_count: 47000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
    description: 'A groundbreaking tour of the mind and explains the two systems that drive the way we think.',
    pages: 512, publisher: 'Farrar, Straus and Giroux', stock: 160,
    is_bestseller: true, discount_percent: 39,
    tags: ['psychology', 'decision making', 'economics', 'science'],
  },

  // TEENS & YA 
  {
    title: 'The Hunger Games',
    author: 'Suzanne Collins',
    price: 349, original_price: 499,
    rating: 4.7, reviews_count: 120000,
    category: 'Teens & YA',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg',
    description: 'In a dystopian future, Katniss Everdeen volunteers to fight in a televised death match.',
    pages: 374, publisher: 'Scholastic', stock: 250,
    is_bestseller: true, is_trending: true, discount_percent: 30,
    tags: ['dystopia', 'young adult', 'action', 'series'],
  },
  {
    title: 'The Fault in Our Stars',
    author: 'John Green',
    price: 299, original_price: 499,
    rating: 4.6, reviews_count: 92000,
    category: 'Teens & YA',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780525478812-L.jpg',
    description: 'Two teenagers with cancer fall in love. A story about love, loss, and living life fully.',
    pages: 313, publisher: 'Dutton Books', stock: 200,
    is_bestseller: true, is_featured: true, discount_percent: 40,
    tags: ['young adult', 'romance', 'contemporary', 'john green'],
  },
  {
    title: 'Percy Jackson and the Lightning Thief',
    author: 'Rick Riordan',
    price: 279, original_price: 449,
    rating: 4.7, reviews_count: 85000,
    category: 'Teens & YA',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780786838653-L.jpg',
    description: 'A boy discovers he is the son of a Greek god and must prevent a war between the gods.',
    pages: 377, publisher: 'Hyperion', stock: 300,
    is_bestseller: true, is_trending: true, discount_percent: 38,
    tags: ['fantasy', 'mythology', 'young adult', 'adventure', 'series'],
  },

  // KIDS 
  {
    title: 'Charlotte\'s Web',
    author: 'E.B. White',
    price: 199, original_price: 299,
    rating: 4.8, reviews_count: 65000,
    category: 'Kids',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780061124952-L.jpg',
    description: 'The classic story of friendship between a pig named Wilbur and a spider named Charlotte.',
    pages: 192, publisher: 'HarperCollins', stock: 300,
    is_featured: true, is_bestseller: true, discount_percent: 33,
    tags: ['children', 'classic', 'friendship', 'animals'],
  },
  {
    title: 'The Very Hungry Caterpillar',
    author: 'Eric Carle',
    price: 249, original_price: 349,
    rating: 4.9, reviews_count: 48000,
    category: 'Kids',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780399226908-L.jpg',
    description: 'A classic picture book about a caterpillar that eats through a variety of foods.',
    pages: 26, publisher: 'Philomel', stock: 400,
    is_featured: true, is_bestseller: true, discount_percent: 29,
    tags: ['picture book', 'children', 'classic', 'counting'],
  },

  // EXAMS
  {
    title: 'Objective General English',
    author: 'S.P. Bakshi',
    price: 299, original_price: 450,
    rating: 4.3, reviews_count: 28000,
    category: 'Exams',
    cover_image: 'https://covers.openlibrary.org/b/id/10527843-L.jpg',
    description: 'Comprehensive guide for English section in competitive exams like SSC, Banking, Railways.',
    pages: 840, publisher: 'Arihant', stock: 200,
    is_featured: true, is_bestseller: true, discount_percent: 34,
    tags: ['exam', 'SSC', 'banking', 'english', 'competitive'],
  },
  {
    title: 'Quantitative Aptitude for Competitive Examinations',
    author: 'R.S. Aggarwal',
    price: 449, original_price: 650,
    rating: 4.5, reviews_count: 42000,
    category: 'Exams',
    cover_image: 'https://covers.openlibrary.org/b/id/10527844-L.jpg',
    description: 'The ultimate guide for quantitative aptitude for all competitive examinations.',
    pages: 1056, publisher: 'S. Chand', stock: 250,
    is_bestseller: true, is_trending: true, discount_percent: 31,
    tags: ['exam', 'aptitude', 'mathematics', 'competitive', 'SSC', 'CAT'],
  },

  // AWARD WINNERS 
  {
    title: 'Demon Copperhead',
    author: 'Barbara Kingsolver',
    price: 549, original_price: 799,
    rating: 4.5, reviews_count: 15000,
    category: 'Award Winners',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780063251922-L.jpg',
    description: 'Pulitzer Prize 2023. A modern retelling of David Copperfield set in Appalachia.',
    pages: 560, publisher: 'Harper', stock: 80,
    is_featured: true, is_new_arrival: true, discount_percent: 31,
    tags: ['pulitzer', 'award winner', 'literary fiction', 'american'],
  },
  {
    title: 'The Covenant of Water',
    author: 'Abraham Verghese',
    price: 499, original_price: 799,
    rating: 4.6, reviews_count: 8500,
    category: 'Award Winners',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780802162175-L.jpg',
    description: 'An epic novel spanning three generations of a family in South India.',
    pages: 736, publisher: 'Grove Press', stock: 70,
    is_new_arrival: true, is_featured: true, discount_percent: 38,
    tags: ['award winner', 'india', 'family saga', 'literary'],
  },

  // MANGA
  {
    title: 'One Piece Vol. 1',
    author: 'Eiichiro Oda',
    price: 199, original_price: 299,
    rating: 4.9, reviews_count: 55000,
    category: 'Manga',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781569319017-L.jpg',
    description: 'The legendary manga series about Monkey D. Luffy and his quest to become King of the Pirates.',
    pages: 216, publisher: 'Viz Media', stock: 300,
    is_bestseller: true, is_trending: true, discount_percent: 33,
    tags: ['manga', 'action', 'adventure', 'one piece', 'shounen'],
  },
  {
    title: 'Naruto Vol. 1',
    author: 'Masashi Kishimoto',
    price: 199, original_price: 299,
    rating: 4.8, reviews_count: 48000,
    category: 'Manga',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781569319000-L.jpg',
    description: 'Follow Naruto Uzumaki, a young ninja who seeks recognition and dreams of becoming Hokage.',
    pages: 192, publisher: 'Viz Media', stock: 280,
    is_bestseller: true, is_trending: true, discount_percent: 33,
    tags: ['manga', 'ninja', 'action', 'naruto', 'shounen'],
  },

  // TODAY'S DEAL
  {
    title: 'The 5 AM Club',
    author: 'Robin Sharma',
    price: 249, original_price: 599,
    rating: 4.3, reviews_count: 22000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9781443456623-L.jpg',
    description: 'Own Your Morning. Elevate Your Life. The secret of the ultra-successful explained.',
    pages: 368, publisher: 'HarperCollins', stock: 160,
    is_trending: true, is_featured: true, discount_percent: 58,
    tags: ['self-help', 'morning routine', 'productivity', "today's deal"],
  },
  {
    title: 'Ikigai: The Japanese Secret to a Long and Happy Life',
    author: 'Héctor García',
    price: 199, original_price: 499,
    rating: 4.4, reviews_count: 31000,
    category: 'Non-Fiction',
    cover_image: 'https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg',
    description: 'Find your ikigai – the Japanese concept for the happiness of always being busy.',
    pages: 208, publisher: 'Penguin Life', stock: 200,
    is_bestseller: true, is_featured: true, discount_percent: 60,
    tags: ['philosophy', 'japan', 'happiness', "today's deal", 'self-help'],
  },
];

// Seed Function
async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // 1. Create/Update Admin User
    console.log('👤 Setting up admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.findOneAndUpdate(
      { email: 'admin@stolebooks.com' },
      {
        full_name:   'STOLEBOOKS Admin',
        email:       'admin@stolebooks.com',
        password:    hashedPassword,
        phone:       '9999999999',
        role:        'admin',
        is_verified: true,
      },
      { upsert: true, new: true }
    );
    console.log('✅ Admin user ready!');
    console.log('   Email   : admin@stolebooks.com');
    console.log('   Password: admin123\n');

    // 2. Seed Books
    console.log('📚 Seeding books...');
    let added = 0, skipped = 0;

    for (const book of books) {
      const exists = await Book.findOne({ title: book.title, author: book.author });
      if (!exists) {
        await Book.create(book);
        added++;
        process.stdout.write(`   ✅ Added: ${book.title}\n`);
      } else {
        skipped++;
      }
    }

    const total = await Book.countDocuments();
    console.log(`\n📊 Seed Summary:`);
    console.log(`   ✅ Books added  : ${added}`);
    console.log(`   ⏭️  Books skipped: ${skipped} (already exist)`);
    console.log(`   📚 Total books  : ${total}`);
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n🚀 Now run: node server.js');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  MongoDB is not running!');
      console.error('   Option 1: Install & start MongoDB locally');
      console.error('             https://www.mongodb.com/docs/manual/installation/');
      console.error('   Option 2: Use MongoDB Atlas (free cloud DB)');
      console.error('             https://mongodb.com/atlas');
      console.error('             Then set MONGODB_URI in your .env file');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
