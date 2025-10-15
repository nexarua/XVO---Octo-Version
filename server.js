
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const PORT = 5000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// JSON file paths
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const POSTS_FILE = path.join(__dirname, 'posts.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Helper functions for JSON storage
function readJSON(filepath) {
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function writeJSON(filepath, data) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// Initialize JSON files if they don't exist
if (!fs.existsSync(ACCOUNTS_FILE)) {
    writeJSON(ACCOUNTS_FILE, []);
}
if (!fs.existsSync(POSTS_FILE)) {
    writeJSON(POSTS_FILE, []);
}
if (!fs.existsSync(MESSAGES_FILE)) {
    writeJSON(MESSAGES_FILE, []);
}

console.log('✓ Using JSON file storage');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Configure multer for image uploads with size limit (9GB)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 9 * 1024 * 1024 * 1024 // 9GB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(bodyParser.json());

app.use('/uploads', express.static(UPLOADS_DIR));

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/attached_assets/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'attached_assets', req.params.filename));
});

// ========== ACCOUNTS API ==========

app.get('/api/accounts', (req, res) => {
    try {
        const accounts = readJSON(ACCOUNTS_FILE);
        const sanitizedAccounts = accounts.map(acc => ({
            ...acc,
            password: 'hashed'
        }));
        res.json(sanitizedAccounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

app.post('/api/accounts', async (req, res) => {
    try {
        const accounts = readJSON(ACCOUNTS_FILE);
        const newAccount = req.body;
        
        // Check if username exists
        if (accounts.find(acc => acc.username === newAccount.username)) {
            return res.status(400).json({ error: 'This Username already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(newAccount.password, 10);
        
        const account = {
            id: accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1,
            name: newAccount.name,
            username: newAccount.username,
            password: hashedPassword,
            displayName: newAccount.name,
            bio: '',
            avatar: newAccount.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
            followers: [],
            following: [],
            privacySettings: { allowFollowRequests: true, allowDirectMessages: true, showActivity: true, showLastOnline: true },
            verifiedID: false,
            badge: null,
            badgeIssuedBy: null,
            isAdmin: false,
            isSuspended: false,
            lastOnline: Date.now()
        };
        
        accounts.push(account);
        writeJSON(ACCOUNTS_FILE, accounts);
        
        const sanitizedAccount = { ...account, password: 'hashed' };
        res.json(sanitizedAccount);
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: 'Failed to create an account' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const accounts = readJSON(ACCOUNTS_FILE);
        
        const account = accounts.find(acc => acc.username === username);
        if (!account) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const sanitizedAccount = { ...account, password: 'hashed' };
        res.json(sanitizedAccount);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.put('/api/accounts/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;
        const accounts = readJSON(ACCOUNTS_FILE);
        
        const accountIndex = accounts.findIndex(acc => acc.id === id);
        if (accountIndex === -1) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        // Hash password if it's being updated
        if (updates.password && updates.password !== 'hashed') {
            updates.password = await bcrypt.hash(updates.password, 10);
        } else if (updates.password === 'hashed') {
            delete updates.password;
        }
        
        // Update lastOnline timestamp only if not explicitly provided
        if (!updates.lastOnline) {
            updates.lastOnline = Date.now();
        }
        
        // Merge updates with existing account
        accounts[accountIndex] = { ...accounts[accountIndex], ...updates };
        
        // Write to JSON file
        writeJSON(ACCOUNTS_FILE, accounts);
        
        console.log(`Account ${id} updated successfully:`, {
            displayName: accounts[accountIndex].displayName,
            bio: accounts[accountIndex].bio?.substring(0, 50),
            followers: accounts[accountIndex].followers?.length,
            lastOnline: new Date(accounts[accountIndex].lastOnline).toISOString()
        });
        
        const sanitizedAccount = { ...accounts[accountIndex], password: 'hashed' };
        res.json(sanitizedAccount);
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account' });
    }
});

// ========== POSTS API ==========

app.get('/api/posts', (req, res) => {
    try {
        const posts = readJSON(POSTS_FILE);
        posts.sort((a, b) => b.timestamp - a.timestamp);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

app.post('/api/posts', (req, res) => {
    try {
        const posts = readJSON(POSTS_FILE);
        const newPost = req.body;
        
        const post = {
            id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
            userId: newPost.userId,
            text: newPost.text,
            timestamp: newPost.timestamp,
            likes: newPost.likes || [],
            retweets: newPost.retweets || [],
            comments: newPost.comments || [],
            image: newPost.image || null,
            mood: newPost.mood || null,
            location: newPost.location || null
        };
        
        posts.push(post);
        writeJSON(POSTS_FILE, posts);
        
        res.json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

app.put('/api/posts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;
        const posts = readJSON(POSTS_FILE);
        
        const postIndex = posts.findIndex(post => post.id === id);
        if (postIndex === -1) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        posts[postIndex] = { ...posts[postIndex], ...updates };
        writeJSON(POSTS_FILE, posts);
        
        res.json(posts[postIndex]);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: 'Failed to update post' });
    }
});

app.delete('/api/posts/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let posts = readJSON(POSTS_FILE);
        
        posts = posts.filter(post => post.id !== id);
        writeJSON(POSTS_FILE, posts);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// ========== COMMENTS API ==========

app.post('/api/posts/:id/comments', (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { userId, text } = req.body;
        const posts = readJSON(POSTS_FILE);
        
        const post = posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        if (!post.comments) {
            post.comments = [];
        }
        
        const comment = {
            id: post.comments.length > 0 ? Math.max(...post.comments.map(c => c.id)) + 1 : 1,
            userId: userId,
            text: text,
            timestamp: Date.now()
        };
        
        post.comments.push(comment);
        writeJSON(POSTS_FILE, posts);
        
        res.json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.delete('/api/posts/:postId/comments/:commentId', (req, res) => {
    try {
        const postId = parseInt(req.params.postId);
        const commentId = parseInt(req.params.commentId);
        const posts = readJSON(POSTS_FILE);
        
        const post = posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        post.comments = post.comments.filter(c => c.id !== commentId);
        writeJSON(POSTS_FILE, posts);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.json({ 
        success: true, 
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size
    });
});

// ========== MESSAGES API ==========

app.get('/api/messages/:userId', (req, res) => {
    try {
        const requestedUserId = parseInt(req.params.userId);
        const authUserId = parseInt(req.headers['x-user-id']);
        
        if (!authUserId || authUserId !== requestedUserId) {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own messages' });
        }
        
        const messages = readJSON(MESSAGES_FILE);
        
        const userMessages = messages.filter(m => 
            m.senderId === requestedUserId || m.receiverId === requestedUserId
        );
        
        const conversationMap = new Map();
        userMessages.forEach(msg => {
            const otherUserId = msg.senderId === requestedUserId ? msg.receiverId : msg.senderId;
            if (!conversationMap.has(otherUserId) || msg.timestamp > conversationMap.get(otherUserId).timestamp) {
                conversationMap.set(otherUserId, msg);
            }
        });
        
        const conversations = Array.from(conversationMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);
        
        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

app.get('/api/messages/:userId/:otherUserId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const otherUserId = parseInt(req.params.otherUserId);
        const authUserId = parseInt(req.headers['x-user-id']);
        
        if (!authUserId || authUserId !== userId) {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own conversations' });
        }
        
        const messages = readJSON(MESSAGES_FILE);
        
        const conversation = messages.filter(m =>
            (m.senderId === userId && m.receiverId === otherUserId) ||
            (m.senderId === otherUserId && m.receiverId === userId)
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        res.json(conversation);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/messages', (req, res) => {
    try {
        const messages = readJSON(MESSAGES_FILE);
        const { senderId, receiverId, text } = req.body;
        const authUserId = parseInt(req.headers['x-user-id']);
        
        if (!authUserId || authUserId !== senderId) {
            return res.status(403).json({ error: 'Unauthorized: You can only send messages as yourself' });
        }
        
        const message = {
            id: messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1,
            senderId,
            receiverId,
            text,
            timestamp: Date.now(),
            read: false
        };
        
        messages.push(message);
        writeJSON(MESSAGES_FILE, messages);
        
        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.delete('/api/messages/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const authUserId = parseInt(req.headers['x-user-id']);
        
        if (!authUserId) {
            return res.status(403).json({ error: 'Unauthorized: Authentication required' });
        }
        
        const messages = readJSON(MESSAGES_FILE);
        const message = messages.find(m => m.id === id);
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        if (message.senderId !== authUserId && message.receiverId !== authUserId) {
            return res.status(403).json({ error: 'Unauthorized: You can only delete your own messages' });
        }
        
        const filteredMessages = messages.filter(m => m.id !== id);
        writeJSON(MESSAGES_FILE, filteredMessages);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 9GB.' });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`XVO server running on port ${PORT}`);
});
