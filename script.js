// ========== TOAST NOTIFICATION SYSTEM ==========
class Toast {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static success(message) { this.show(message, 'success'); }
    static error(message) { this.show(message, 'error'); }
    static info(message) { this.show(message, 'info'); }
}

// ========== DATA STORAGE ==========
class Database {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : window.location.origin;
        this.init();
    }

    async init() {
        try {
            const accountsResponse = await fetch(`${this.apiUrl}/api/accounts`);
            if (accountsResponse.ok) {
                const accounts = await accountsResponse.json();
                if (accounts.length > 0) {
                    localStorage.setItem('accounts', JSON.stringify(accounts));
                }
            }
        } catch (error) {
            console.log('Loading accounts from localStorage');
        }

        try {
            const postsResponse = await fetch(`${this.apiUrl}/api/posts`);
            if (postsResponse.ok) {
                const posts = await postsResponse.json();
                if (posts.length > 0) {
                    localStorage.setItem('xvo_posts', JSON.stringify(posts));
                }
            }
        } catch (error) {
            console.log('Loading posts from localStorage');
        }

        if (!localStorage.getItem('xvo_notifications')) {
            localStorage.setItem('xvo_notifications', JSON.stringify([]));
        }

        if (!localStorage.getItem('xvo_confessions')) {
            localStorage.setItem('xvo_confessions', JSON.stringify([]));
        }
    }

    getAccounts() {
        return JSON.parse(localStorage.getItem('accounts') || '[]');
    }

    getAccount(id) {
        return this.getAccounts().find(a => a.id === parseInt(id));
    }

    getAccountByUsername(username) {
        return this.getAccounts().find(a => a.username === username);
    }

    async createAccount(name, username, password, avatar = null) {
        const newAccount = {
            name: name,
            username: username,
            password: password,
            displayName: name,
            bio: '',
            avatar: avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
            followers: [],
            following: [],
            privacySettings: {
                allowFollowRequests: true,
                allowDirectMessages: true,
                showActivity: true
            },
            verifiedID: false,
            badge: null,
            badgeIssuedBy: null,
            isAdmin: false,
            isSuspended: false
        };

        try {
            const response = await fetch(`${this.apiUrl}/api/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create account');
            }

            const account = await response.json();
            const accounts = this.getAccounts();
            accounts.push(account);
            localStorage.setItem('accounts', JSON.stringify(accounts));
            return account;
        } catch (err) {
            throw err;
        }
    }

    async updateAccount(account) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === account.id);
        if (index !== -1) {
            accounts[index] = account;
            localStorage.setItem('accounts', JSON.stringify(accounts));

            try {
                const response = await fetch(`${this.apiUrl}/api/accounts/${account.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(account)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to sync account to server');
                }
                
                const updatedAccount = await response.json();
                accounts[index] = updatedAccount;
                localStorage.setItem('accounts', JSON.stringify(accounts));
            } catch (err) {
                console.error('Sync error:', err);
            }
        }
    }

    async authenticate(username, password) {
        try {
            const response = await fetch(`${this.apiUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                return null;
            }

            const account = await response.json();
            localStorage.setItem('xvo_current_user', String(account.id));

            const accounts = this.getAccounts();
            const index = accounts.findIndex(a => a.id === account.id);
            if (index !== -1) {
                accounts[index] = account;
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }

            return account;
        } catch (error) {
            return null;
        }
    }

    getCurrentUser() {
        const id = localStorage.getItem('xvo_current_user');
        return id ? this.getAccount(id) : null;
    }

    isAuthenticated() {
        return localStorage.getItem('xvo_current_user') !== null;
    }

    logout() {
        localStorage.removeItem('xvo_current_user');
    }

    getPosts() {
        return JSON.parse(localStorage.getItem('xvo_posts') || '[]');
    }

    getPost(id) {
        return this.getPosts().find(p => p.id === parseInt(id));
    }

    getUserPosts(userId) {
        return this.getPosts().filter(p => p.userId === userId);
    }

    addPost(post) {
        const posts = this.getPosts();
        post.id = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
        posts.unshift(post);
        localStorage.setItem('xvo_posts', JSON.stringify(posts));

        fetch(`${this.apiUrl}/api/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post)
        }).catch(err => console.log('Sync error:', err));

        return post;
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${this.apiUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    updatePost(post) {
        const posts = this.getPosts();
        const index = posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
            posts[index] = post;
            localStorage.setItem('xvo_posts', JSON.stringify(posts));

            fetch(`${this.apiUrl}/api/posts/${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            }).catch(err => console.log('Sync error:', err));
        }
    }

    deletePost(postId) {
        const posts = this.getPosts().filter(p => p.id !== postId);
        localStorage.setItem('xvo_posts', JSON.stringify(posts));

        fetch(`${this.apiUrl}/api/posts/${postId}`, {
            method: 'DELETE'
        }).catch(err => console.log('Sync error:', err));
    }

    async addComment(postId, userId, text) {
        try {
            const response = await fetch(`${this.apiUrl}/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, text })
            });

            if (!response.ok) {
                throw new Error('Failed to add comment');
            }

            const comment = await response.json();
            const posts = this.getPosts();
            const post = posts.find(p => p.id === postId);
            if (post) {
                if (!post.comments) post.comments = [];
                post.comments.push(comment);
                localStorage.setItem('xvo_posts', JSON.stringify(posts));
            }
            return comment;
        } catch (error) {
            throw error;
        }
    }

    async deleteComment(postId, commentId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/posts/${postId}/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete comment');
            }

            const posts = this.getPosts();
            const post = posts.find(p => p.id === postId);
            if (post) {
                post.comments = post.comments.filter(c => c.id !== commentId);
                localStorage.setItem('xvo_posts', JSON.stringify(posts));
            }
        } catch (error) {
            throw error;
        }
    }

    getNotifications() {
        return JSON.parse(localStorage.getItem('xvo_notifications') || '[]');
    }

    addNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
        notification.timestamp = Date.now();
        notification.read = false;
        notifications.unshift(notification);
        localStorage.setItem('xvo_notifications', JSON.stringify(notifications));
    }

    markAllNotificationsAsRead(userId) {
        const notifications = this.getNotifications();
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.read = true;
            }
        });
        localStorage.setItem('xvo_notifications', JSON.stringify(notifications));
    }

    getConfessions() {
        return JSON.parse(localStorage.getItem('xvo_confessions') || '[]');
    }

    addConfession(confession) {
        const confessions = this.getConfessions();
        confession.id = confessions.length > 0 ? Math.max(...confessions.map(c => c.id)) + 1 : 1;
        confession.timestamp = Date.now();
        confessions.unshift(confession);
        localStorage.setItem('xvo_confessions', JSON.stringify(confessions));
        return confession;
    }

    getStories() {
        return JSON.parse(localStorage.getItem('xvo_stories') || '[]');
    }

    addStory(story) {
        const stories = this.getStories();
        story.id = stories.length > 0 ? Math.max(...stories.map(s => s.id)) + 1 : 1;
        story.timestamp = Date.now();
        stories.unshift(story);
        localStorage.setItem('xvo_stories', JSON.stringify(stories));
        return story;
    }

    getUserStory(userId) {
        const stories = this.getStories();
        const userStories = stories.filter(s => s.userId === userId);
        if (userStories.length > 0) {
            return userStories[0];
        }
        return null;
    }

    getMemoryPosts(userId) {
        const now = new Date();
        const posts = this.getUserPosts(userId);

        return posts.filter(post => {
            const postDate = new Date(post.timestamp);
            const yearsDiff = now.getFullYear() - postDate.getFullYear();
            const monthsDiff = now.getMonth() - postDate.getMonth();

            return (yearsDiff >= 1 || monthsDiff >= 6) && 
                   postDate.getDate() === now.getDate() &&
                   postDate.getMonth() === now.getMonth();
        });
    }

    async getConversations(userId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/messages/${userId}`, {
                headers: { 'x-user-id': userId.toString() }
            });
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }
    }

    async getMessages(userId, otherUserId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/messages/${userId}/${otherUserId}`, {
                headers: { 'x-user-id': userId.toString() }
            });
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    async sendMessage(senderId, receiverId, text) {
        try {
            const response = await fetch(`${this.apiUrl}/api/messages`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': senderId.toString()
                },
                body: JSON.stringify({ senderId, receiverId, text })
            });
            
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Failed to send message');
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async deleteMessage(messageId, userId) {
        try {
            const response = await fetch(`${this.apiUrl}/api/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': userId.toString() }
            });
            
            if (response.ok) {
                return true;
            }
            throw new Error('Failed to delete message');
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }
}

// ========== APP ==========
class App {
    constructor() {
        this.db = new Database();
        this.currentView = 'home';
        this.init();
    }

    async init() {
        await this.db.init();
        if (!this.db.isAuthenticated()) {
            this.showAuthModal();
        } else {
            this.startApp();
            this.startHeartbeat();
        }
    }

    startHeartbeat() {
        // Update lastOnline every 30 seconds
        setInterval(async () => {
            const currentUser = this.db.getCurrentUser();
            if (currentUser) {
                currentUser.lastOnline = Date.now();
                await this.db.updateAccount(currentUser);
            }
        }, 30000);
    }

    startApp() {
        document.getElementById('authModal').style.display = 'none';
        this.updateSidebar();
        this.addAdminNavIfNeeded();
        this.attachEventListeners();
        this.switchView('home');
        this.updateNotificationBadge();
        this.checkMemoryLane();
    }

    addAdminNavIfNeeded() {
        const currentUser = this.db.getCurrentUser();
        const navItems = document.getElementById('navItems');
        
        // Remove existing admin nav if present
        const existingAdminNav = navItems.querySelector('[data-view="admin"]');
        if (existingAdminNav) {
            existingAdminNav.remove();
        }
        
        // Add admin nav if user is admin or Alz
        if (currentUser && (currentUser.username.toLowerCase() === 'alz' || currentUser.isAdmin === true)) {
            const settingsNav = navItems.querySelector('[data-view="settings"]');
            
            if (settingsNav) {
                const adminNav = document.createElement('a');
                adminNav.className = 'nav-item';
                adminNav.dataset.view = 'admin';
                adminNav.innerHTML = `
                    <i class="fas fa-shield-alt"></i>
                    <span>Admin Panel</span>
                `;
                navItems.insertBefore(adminNav, settingsNav);
                
                // Re-attach event listener for the new admin nav
                adminNav.addEventListener('click', () => {
                    this.switchView('admin');
                });
            }
        }
    }

    updateSidebar() {
        const user = this.db.getCurrentUser();
        if (user) {
            document.getElementById('sidebarAvatar').src = user.avatar;
            const info = document.getElementById('sidebarInfo');
            info.innerHTML = `
                <div style="font-weight: 700; font-size: 15px;">${user.displayName}${this.getBadgeHTML(user).replace('class="verified-badge"', 'class="verified-badge" style="width: 16px; height: 16px;"')}</div>
                <div style="color: var(--text-secondary); font-size: 14px;">@${user.username}</div>
            `;
        }
    }

    showAuthModal() {
        const modal = document.getElementById('authModal');
        modal.style.display = 'flex';

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab === 'login' ? 'loginForm' : 'signupForm').classList.add('active');
            });
        });

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const user = await this.db.authenticate(username, password);
            if (user) {
                this.startApp();
                Toast.success('Welcome back!');
            } else {
                Toast.error('Invalid username or password');
            }
        });

        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const username = document.getElementById('signupUsername').value;
            const password = document.getElementById('signupPassword').value;
            const avatar = document.getElementById('signupAvatar').value;

            if (this.db.getAccountByUsername(username)) {
                Toast.error('Username already exists');
                return;
            }

            try {
                const user = await this.db.createAccount(name, username, password, avatar);
                localStorage.setItem('xvo_current_user', String(user.id));

                const firstPost = {
                    userId: user.id,
                    text: 'I am officially on XVO!',
                    timestamp: Date.now(),
                    likes: [],
                    retweets: [],
                    comments: [],
                    mood: '😊'
                };
                this.db.addPost(firstPost);

                this.startApp();
                Toast.success('Welcome to XVO!');
            } catch (error) {
                Toast.error(error.message || 'Failed to create account');
            }
        });
    }

    attachEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        const postBtn = document.getElementById('postBtn');
        if (postBtn) {
            postBtn.addEventListener('click', () => {
                this.switchView('home');
            });
        }

        

        document.addEventListener('click', (e) => {
            if (e.target.closest('.post[data-user-id]')) {
                const userId = e.target.closest('.post[data-user-id]').dataset.userId;
                if (userId && !e.target.closest('[data-action]')) {
                    this.renderProfile(parseInt(userId));
                }
            }
            if (e.target.closest('.post-avatar') && !e.target.closest('.composer')) {
                const userId = e.target.closest('.post-avatar').dataset.userId;
                if (userId) this.renderProfile(parseInt(userId));
            }
            if (e.target.closest('.post-name')) {
                const userId = e.target.closest('.post-name').dataset.userId;
                if (userId) this.renderProfile(parseInt(userId));
            }
            if (e.target.closest('[data-action="delete-post"]')) {
                const postId = parseInt(e.target.closest('[data-action="delete-post"]').dataset.postId);
                this.deletePost(postId);
            }
            if (e.target.closest('[data-action="toggle-like"]')) {
                const postId = parseInt(e.target.closest('[data-action="toggle-like"]').dataset.postId);
                this.toggleLike(postId);
            }
            if (e.target.closest('[data-action="toggle-retweet"]')) {
                const postId = parseInt(e.target.closest('[data-action="toggle-retweet"]').dataset.postId);
                this.toggleRetweet(postId);
            }
            if (e.target.closest('[data-action="toggle-comments"]')) {
                const postId = parseInt(e.target.closest('[data-action="toggle-comments"]').dataset.postId);
                this.showCommentsModal(postId);
            }
            if (e.target.closest('[data-action="add-comment"]')) {
                const postId = parseInt(e.target.closest('[data-action="add-comment"]').dataset.postId);
                this.addCommentToPost(postId);
            }
            if (e.target.closest('[data-action="delete-comment"]')) {
                const postId = parseInt(e.target.closest('[data-action="delete-comment"]').dataset.postId);
                const commentId = parseInt(e.target.closest('[data-action="delete-comment"]').dataset.commentId);
                this.deleteCommentFromPost(postId, commentId);
            }
            if (e.target.closest('[data-action="create-post"]')) {
                const textareaId = e.target.closest('[data-action="create-post"]').dataset.textareaId;
                this.createPost(textareaId);
            }
            if (e.target.closest('[data-action="back"]')) {
                this.switchView('home');
            }
            if (e.target.closest('[data-action="edit-profile"]')) {
                this.switchView('settings');
            }
            if (e.target.closest('[data-action="toggle-follow"]')) {
                const userId = parseInt(e.target.closest('[data-action="toggle-follow"]').dataset.userId);
                this.toggleFollow(userId);
            }
            if (e.target.closest('[data-action="save-settings"]')) {
                this.saveSettings();
            }
            if (e.target.closest('[data-action="save-privacy"]')) {
                this.savePrivacySettings();
            }
            if (e.target.closest('[data-action="change-password"]')) {
                this.changePassword();
            }
            if (e.target.closest('[data-action="logout"]')) {
                this.logout();
            }
            if (e.target.closest('[data-action="search-hashtag"]')) {
                const tag = e.target.closest('[data-action="search-hashtag"]').dataset.tag;
                this.searchHashtag(tag);
            }
            if (e.target.closest('[data-action="add-emoji"]')) {
                const composer = e.target.closest('[data-action="add-emoji"]').dataset.composer;
                this.showEmojiPicker(composer);
            }
            if (e.target.closest('[data-action="add-location"]')) {
                const composer = e.target.closest('[data-action="add-location"]').dataset.composer;
                this.showLocationPicker(composer);
            }
            if (e.target.closest('[data-action="upload-image"]')) {
                const composer = e.target.closest('[data-action="upload-image"]').dataset.composer;
                this.triggerImageUpload(composer);
            }
            if (e.target.closest('[data-action="post-confession"]')) {
                this.postConfession();
            }
            if (e.target.closest('[data-action="request-verification"]')) {
                this.requestVerification();
            }
            if (e.target.closest('[data-action="create-story"]')) {
                this.createStory();
            }
            if (e.target.closest('[data-action="admin-panel"]')) {
                this.switchView('admin');
            }
            if (e.target.closest('[data-action="suspend-user"]')) {
                const userId = parseInt(e.target.closest('[data-action="suspend-user"]').dataset.userId);
                this.toggleSuspendUser(userId);
            }
            if (e.target.closest('[data-action="assign-badge"]')) {
                const userId = parseInt(e.target.closest('[data-action="assign-badge"]').dataset.userId);
                const badge = e.target.closest('[data-action="assign-badge"]').dataset.badge;
                this.assignBadge(userId, badge);
            }
            if (e.target.closest('[data-action="toggle-admin"]')) {
                const userId = parseInt(e.target.closest('[data-action="toggle-admin"]').dataset.userId);
                this.toggleAdmin(userId);
            }
            if (e.target.closest('[data-action="upload-profile-pic"]')) {
                this.triggerProfilePicUpload();
            }
            if (e.target.closest('.emoji-item')) {
                const emoji = e.target.closest('.emoji-item').textContent;
                this.insertEmoji(emoji);
            }
        });
    }

    switchView(view, query = '') {
        this.currentView = view;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === view) {
                item.classList.add('active');
            }
        });

        const header = document.getElementById('header');

        switch(view) {
            case 'home':
                header.innerHTML = '<h2>Home</h2>';
                this.renderHome();
                break;
            case 'search':
                header.innerHTML = '<h2>Explore</h2>';
                this.renderSearch(query);
                break;
            case 'notifications':
                header.innerHTML = '<h2>Notifications</h2>';
                this.renderNotifications();
                break;
            case 'messages':
                header.innerHTML = '<h2>Messages</h2>';
                this.renderMessages();
                break;
            case 'profile':
                const currentUser = this.db.getCurrentUser();
                this.renderProfile(currentUser.id);
                break;
            case 'settings':
                header.innerHTML = '<h2>Settings</h2>';
                this.renderSettings();
                break;
            case 'confessions':
                header.innerHTML = '<h2>Anonymous Thoughts</h2>';
                this.renderConfessions();
                break;
            case 'memories':
                header.innerHTML = '<h2>Memory Lane</h2>';
                this.renderMemories();
                break;
            case 'stories':
                header.innerHTML = '<h2>Stories</h2>';
                this.renderStories();
                break;
            case 'admin':
                header.innerHTML = '<h2>Admin Panel</h2>';
                this.renderAdminPanel();
                break;
        }
    }

    getBadgeHTML(user) {
        if (!user) return '';

        if (user.badge === 'blue') {
            return '<img src="attached_assets/1200px-Twitter_Verified_Badge.svg_1760187800515.png" class="verified-badge" alt="Verified/Famous/Owner" title="Verified/Famous/Owner - Issued by Alz">';
        } else if (user.badge === 'black') {
            return '<img src="attached_assets/kisspng-secor-chrysler-dodge-jeep-ram-car-computer-icons-no-cost-5b0fed2b8a08b2.4283317715277704115654_1760258728273.jpg" class="verified-badge" alt="CEO/Admin" title="CEO/Admin - Issued by Alz">';
        } else if (user.badge === 'grey') {
            return '<img src="attached_assets/1024px-Twitter_Verified_Badge_Gray.svg_1760258805906.png" class="verified-badge" alt="Business" title="Business - Issued by Alz">';
        } else if (user.badge === 'gold') {
            return '<img src="attached_assets/Twitter_Verified_Badge_Gold.svg_1760258812925.png" class="verified-badge" alt="Government" title="Government - Issued by Alz">';
        } else if (user.username.toLowerCase() === 'alz' || user.verifiedID) {
            return '<img src="attached_assets/1200px-Twitter_Verified_Badge.svg_1760187800515.png" class="verified-badge" alt="Verified">';
        }
        return '';
    }

    async renderHome() {
        const mainContent = document.getElementById('mainContent');
        const currentUser = this.db.getCurrentUser();

        mainContent.innerHTML = `
            <div class="composer">
                <div class="composer-inner">
                    <img src="${currentUser.avatar}" class="user-avatar">
                    <textarea placeholder="What's happening?" id="homeComposer"></textarea>
                </div>
                <div id="homeLocation"></div>
                <div id="homeImagePreview"></div>
                <div id="homeUploadProgress"></div>
                <div class="composer-actions">
                    <div class="composer-icons">
                        <i class="far fa-image" data-action="upload-image" data-composer="home"></i>
                        <i class="fas fa-map-marker-alt" data-action="add-location" data-composer="home"></i>
                        <i class="far fa-smile" data-action="add-emoji" data-composer="home"></i>
                    </div>
                    <button class="post-submit" data-action="create-post" data-textarea-id="homeComposer">Post</button>
                </div>
                <input type="file" id="homeImageUpload" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" style="display: none;">
            </div>
            <div id="homeFeed" class="feed"></div>
        `;

        this.setupImageUploadListener('home');
        await this.renderFeed('homeFeed');
    }

    renderFeed(containerId, posts = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const postsToRender = posts || this.db.getPosts();
        const currentUser = this.db.getCurrentUser();

        container.innerHTML = postsToRender.map(post => {
            const author = this.db.getAccount(post.userId);
            const isLiked = post.likes.includes(currentUser.id);
            const isRetweeted = post.retweets.includes(currentUser.id);
            const isOwnPost = post.userId === currentUser.id;

            return `
                <div class="post">
                    <div class="post-inner">
                        <img src="${author.avatar}" class="post-avatar" data-user-id="${author.id}">
                        <div class="post-content">
                            <div class="post-header">
                                <span class="post-name" data-user-id="${author.id}">${author.displayName}${this.getBadgeHTML(author)}</span>
                                <span class="post-username">@${author.username}</span>
                                <span class="post-dot">·</span>
                                <span class="post-time">${this.formatTime(post.timestamp)}</span>
                                ${isOwnPost ? `<i class="fas fa-trash" style="margin-left: auto; cursor: pointer; color: var(--text-secondary);" data-action="delete-post" data-post-id="${post.id}"></i>` : ''}
                            </div>
                            <div class="post-text">${this.linkify(post.text)}</div>
                            ${post.image ? `<img src="${post.image}" class="post-image" alt="Post image">` : ''}
                            <div class="post-actions">
                                <button class="action-btn" data-action="toggle-comments" data-post-id="${post.id}">
                                    <i class="far fa-comment"></i>
                                    <span>${this.formatFollowerCount(post.comments.length)}</span>
                                </button>
                                <button class="action-btn ${isRetweeted ? 'retweeted' : ''}" data-action="toggle-retweet" data-post-id="${post.id}">
                                    <i class="fas fa-retweet"></i>
                                    <span>${this.formatFollowerCount(post.retweets.length)}</span>
                                </button>
                                <button class="action-btn ${isLiked ? 'liked' : ''}" data-action="toggle-like" data-post-id="${post.id}">
                                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                                    <span>${this.formatFollowerCount(post.likes.length)}</span>
                                </button>
                                <button class="action-btn">
                                    <i class="fas fa-share"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createPost(textareaId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.isSuspended) {
            Toast.error('You are suspended and cannot post');
            return;
        }

        const textarea = document.getElementById(textareaId);
        const text = textarea.value.trim();

        const composer = textareaId.replace('Composer', '');
        const imagePreviewDiv = document.getElementById(composer + 'ImagePreview');
        const imageUrl = imagePreviewDiv?.dataset.imageUrl;

        if (!text && !imageUrl) {
            Toast.error('Please enter some text or add an image');
            return;
        }

        const locationDiv = document.getElementById(composer + 'Location');
        const locationTag = locationDiv?.querySelector('.location-tag span');
        const location = locationTag ? locationTag.textContent : null;

        const post = {
            userId: currentUser.id,
            text: location ? `${text} 📍 ${location}` : text,
            timestamp: Date.now(),
            likes: [],
            retweets: [],
            comments: [],
            image: imageUrl || null
        };

        this.db.addPost(post);
        textarea.value = '';
        if (locationDiv) locationDiv.innerHTML = '';
        if (imagePreviewDiv) {
            imagePreviewDiv.innerHTML = '';
            imagePreviewDiv.removeAttribute('data-image-url');
        }

        Toast.success('Post created!');

        if (this.currentView === 'home') {
            this.renderFeed('homeFeed');
        } else if (this.currentView === 'profile') {
            this.renderProfile(currentUser.id);
        }
    }

    deletePost(postId) {
        this.db.deletePost(postId);
        Toast.success('Post deleted');
        if (this.currentView === 'home') {
            this.renderFeed('homeFeed');
        } else if (this.currentView === 'profile') {
            const currentUser = this.db.getCurrentUser();
            this.renderProfile(currentUser.id);
        }
    }

    toggleLike(postId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.isSuspended) {
            Toast.error('You are suspended and cannot react to posts');
            return;
        }

        const post = this.db.getPost(postId);

        if (post.likes.includes(currentUser.id)) {
            post.likes = post.likes.filter(id => id !== currentUser.id);
        } else {
            post.likes.push(currentUser.id);
            if (post.userId !== currentUser.id) {
                this.db.addNotification({
                    type: 'like',
                    userId: post.userId,
                    fromUserId: currentUser.id,
                    postId: post.id
                });
            }
        }

        this.db.updatePost(post);

        if (this.currentView === 'home') {
            this.renderFeed('homeFeed');
        } else if (this.currentView === 'profile') {
            this.renderFeed('profileFeed', this.db.getUserPosts(this.viewingUserId));
        }
        this.updateNotificationBadge();
    }

    toggleRetweet(postId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.isSuspended) {
            Toast.error('You are suspended and cannot react to posts');
            return;
        }

        const post = this.db.getPost(postId);

        if (post.retweets.includes(currentUser.id)) {
            post.retweets = post.retweets.filter(id => id !== currentUser.id);
        } else {
            post.retweets.push(currentUser.id);
            if (post.userId !== currentUser.id) {
                this.db.addNotification({
                    type: 'retweet',
                    userId: post.userId,
                    fromUserId: currentUser.id,
                    postId: post.id
                });
            }
        }

        this.db.updatePost(post);

        if (this.currentView === 'home') {
            this.renderFeed('homeFeed');
        } else if (this.currentView === 'profile') {
            this.renderFeed('profileFeed', this.db.getUserPosts(this.viewingUserId));
        }
        this.updateNotificationBadge();
    }

    async renderProfile(userId) {
        this.viewingUserId = userId;
        const user = this.db.getAccount(userId);
        const currentUser = this.db.getCurrentUser();
        const isOwnProfile = user.id === currentUser.id;
        const isFollowing = currentUser.following.includes(user.id);
        const userPosts = this.db.getUserPosts(userId);

        const totalLikes = userPosts.reduce((sum, post) => sum + post.likes.length, 0);
        const totalRetweets = userPosts.reduce((sum, post) => sum + post.retweets.length, 0);

        const header = document.getElementById('header');
        header.innerHTML = `
            <button class="back-btn" data-action="back">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div>
                <h2>${user.displayName}</h2>
                <div style="color: var(--text-secondary); font-size: 13px;">${userPosts.length} Posts</div>
            </div>
        `;

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="profile-banner"></div>
            <div class="profile-info">
                <div style="position: relative;">
                    <img src="${user.avatar}" class="profile-avatar-large" id="profileAvatarImage">
                </div>
                <div class="profile-actions">
                    ${isOwnProfile ? 
                        `<button class="edit-btn" data-action="edit-profile">Edit profile</button>` :
                        `<div style="display: flex; gap: 8px;">
                            <button class="follow-btn ${isFollowing ? 'following-btn' : ''}" data-action="toggle-follow" data-user-id="${user.id}">
                                ${isFollowing ? 'Following' : 'Follow'}
                            </button>
                            <button class="follow-btn" onclick="app.renderConversation(${user.id})" style="background: transparent; border: 1px solid var(--border-color);">
                                <i class="far fa-envelope"></i> Message
                            </button>
                        </div>`
                    }
                </div>
                <div class="profile-name">${user.displayName}${this.getBadgeHTML(user)}</div>
                <div class="profile-username">@${user.username}${user.isSuspended ? ' <span style="color: var(--danger); font-weight: 700;">(SUSPENDED)</span>' : ''}</div>
                ${this.getOnlineStatus(user)}
                ${user.bio ? `<div class="profile-bio">${user.bio}</div>` : ''}
                <div class="profile-stats">
                    <div class="stat">
                        <span class="stat-value">${this.formatFollowerCount(user.following.length)}</span>
                        <span class="stat-label"> Following</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.formatFollowerCount(user.followers.length)}</span>
                        <span class="stat-label"> Followers</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.formatFollowerCount(totalLikes)}</span>
                        <span class="stat-label"> Likes</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${this.formatFollowerCount(totalRetweets)}</span>
                        <span class="stat-label"> Retweets</span>
                    </div>
                </div>
            </div>
            <div class="profile-tabs">
                <div class="profile-tab active" data-tab="posts">Posts</div>
                <div class="profile-tab" data-tab="stories">Stories</div>
            </div>
            <div id="profileTabContent">
                ${isOwnProfile ? `
                    <div class="composer">
                        <div class="composer-inner">
                            <img src="${currentUser.avatar}" class="user-avatar">
                            <textarea placeholder="What's happening?" id="profileComposer"></textarea>
                        </div>
                        <div id="profileLocation"></div>
                        <div id="profileImagePreview"></div>
                        <div id="profileUploadProgress"></div>
                        <div class="composer-actions">
                            <div class="composer-icons">
                                <i class="far fa-image" data-action="upload-image" data-composer="profile"></i>
                                <i class="fas fa-map-marker-alt" data-action="add-location" data-composer="profile"></i>
                                <i class="far fa-smile" data-action="add-emoji" data-composer="profile"></i>
                            </div>
                            <button class="post-submit" data-action="create-post" data-textarea-id="profileComposer">Post</button>
                        </div>
                        <input type="file" id="profileImageUpload" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" style="display: none;">
                    </div>
                ` : ''}
                <div id="profileFeed" class="feed"></div>
            </div>
        `;

        this.renderFeed('profileFeed', userPosts);

        if (isOwnProfile) {
            this.setupImageUploadListener('profile');
        }

        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (tab.dataset.tab === 'stories') {
                    this.renderProfileStories(userId);
                } else {
                    this.renderProfilePosts(userId);
                }
            });
        });
    }

    async toggleFollow(userId) {
        const currentUser = this.db.getCurrentUser();
        const targetUser = this.db.getAccount(userId);

        if (!targetUser.privacySettings.allowFollowRequests && !currentUser.following.includes(userId)) {
            Toast.error('This user has disabled follow requests');
            return;
        }

        if (currentUser.following.includes(userId)) {
            currentUser.following = currentUser.following.filter(id => id !== userId);
            targetUser.followers = targetUser.followers.filter(id => id !== currentUser.id);
            Toast.info('Unfollowed');
        } else {
            currentUser.following.push(userId);
            targetUser.followers.push(currentUser.id);
            this.db.addNotification({
                type: 'follow',
                userId: userId,
                fromUserId: currentUser.id
            });
            Toast.success('Following!');
        }

        await this.db.updateAccount(currentUser);
        await this.db.updateAccount(targetUser);
        this.renderProfile(userId);
        this.updateNotificationBadge();
    }

    renderSearch(query = '') {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div style="padding: 20px;">
                <div class="search-wrapper" style="margin-bottom: 20px;">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" placeholder="Search Xvo" id="searchInput" value="${query}">
                </div>
                <div id="searchResults"></div>
            </div>
        `;

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        if (query) {
            this.performSearch(query);
        }
    }

    performSearch(query) {
        const resultsDiv = document.getElementById('searchResults');
        if (!query.trim()) {
            resultsDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">Search for people and posts</p>';
            return;
        }

        const users = this.db.getAccounts().filter(u => 
            u.name.toLowerCase().includes(query.toLowerCase()) || 
            u.username.toLowerCase().includes(query.toLowerCase())
        );

        const posts = this.db.getPosts().filter(p => 
            p.text.toLowerCase().includes(query.toLowerCase())
        );

        let html = '';

        if (users.length > 0) {
            html += '<h3 style="margin-bottom: 16px; font-size: 20px; font-weight: 700;">People</h3>';
            users.forEach(user => {
                html += `
                    <div class="post" data-user-id="${user.id}" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                        <img src="${user.avatar}" class="user-avatar">
                        <div>
                            <div style="font-weight: 700;">${user.displayName}</div>
                            <div style="color: var(--text-secondary);">@${user.username}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (posts.length > 0) {
            html += '<h3 style="margin: 24px 0 16px; font-size: 20px; font-weight: 700;">Posts</h3>';
            html += '<div id="searchPosts"></div>';
        }

        if (users.length === 0 && posts.length === 0) {
            html = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No results found</p>';
        }

        resultsDiv.innerHTML = html;

        if (posts.length > 0) {
            this.renderFeed('searchPosts', posts);
        }
    }

    renderNotifications() {
        const mainContent = document.getElementById('mainContent');
        const notifications = this.db.getNotifications();
        const currentUser = this.db.getCurrentUser();
        const userNotifications = notifications.filter(n => n.userId === currentUser.id);

        if (userNotifications.length === 0) {
            mainContent.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No notifications yet</p>';
            return;
        }

        mainContent.innerHTML = userNotifications.map(notif => {
            const fromUser = this.db.getAccount(notif.fromUserId);
            let icon = '';
            let text = '';

            switch(notif.type) {
                case 'like':
                    icon = '<i class="fas fa-heart" style="color: #f91880;"></i>';
                    text = 'liked your post';
                    break;
                case 'retweet':
                    icon = '<i class="fas fa-retweet" style="color: #00ba7c;"></i>';
                    text = 'retweeted your post';
                    break;
                case 'comment':
                    icon = '<i class="fas fa-comment" style="color: var(--twitter-blue);"></i>';
                    text = 'commented on your post';
                    break;
                case 'follow':
                    icon = '<i class="fas fa-user" style="color: var(--twitter-blue);"></i>';
                    text = 'followed you';
                    break;
                case 'verification_approved':
                    icon = '<i class="fas fa-check-circle" style="color: var(--twitter-blue);"></i>';
                    text = 'approved your verification request';
                    break;
                case 'verification_denied':
                    icon = '<i class="fas fa-times-circle" style="color: var(--danger);"></i>';
                    text = 'denied your verification request';
                    break;
            }

            return `
                <div class="post" data-user-id="${fromUser.id}" style="background: ${notif.read ? 'transparent' : 'rgba(29,155,240,0.1)'}; cursor: pointer;">
                    <div class="post-inner">
                        ${icon}
                        <div style="flex: 1; margin-left: 12px;">
                            <img src="${fromUser.avatar}" class="user-avatar" style="margin-bottom: 8px;">
                            <div><strong>${fromUser.displayName}</strong> ${text}</div>
                            <div style="color: var(--text-secondary); font-size: 14px;">${this.formatTime(notif.timestamp)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.db.markAllNotificationsAsRead(currentUser.id);
        this.updateNotificationBadge();
    }

    async renderMessages() {
        const mainContent = document.getElementById('mainContent');
        const currentUser = this.db.getCurrentUser();
        const conversations = await this.db.getConversations(currentUser.id);

        if (conversations.length === 0) {
            mainContent.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <i class="far fa-envelope" style="font-size: 64px; color: var(--text-secondary); margin-bottom: 16px;"></i>
                    <p style="color: var(--text-secondary); font-size: 18px;">No messages yet</p>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">Start a conversation from a user's profile</p>
                </div>
            `;
            return;
        }

        mainContent.innerHTML = conversations.map(msg => {
            const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
            const otherUser = this.db.getAccount(otherUserId);
            const isUnread = !msg.read && msg.receiverId === currentUser.id;
            
            return `
                <div class="post" data-conversation-id="${otherUserId}" style="background: ${isUnread ? 'rgba(29,155,240,0.1)' : 'transparent'}; cursor: pointer;" onclick="app.renderConversation(${otherUserId})">
                    <div class="post-inner">
                        <img src="${otherUser.avatar}" class="post-avatar">
                        <div style="flex: 1;">
                            <div class="post-header">
                                <span class="post-name">${otherUser.displayName}</span>
                                ${this.getBadgeHTML(otherUser)}
                                <span class="post-dot">·</span>
                                <span class="post-time">${this.formatTime(msg.timestamp)}</span>
                            </div>
                            <div class="post-username">@${otherUser.username}</div>
                            <div style="color: ${isUnread ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: ${isUnread ? '600' : '400'}; margin-top: 4px;">${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderConversation(otherUserId) {
        const currentUser = this.db.getCurrentUser();
        const otherUser = this.db.getAccount(otherUserId);
        const messages = await this.db.getMessages(currentUser.id, otherUserId);
        
        const header = document.getElementById('header');
        header.innerHTML = `
            <button class="back-btn" onclick="app.switchView('messages')">
                <i class="fas fa-arrow-left"></i>
            </button>
            <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="app.renderProfile(${otherUserId})">
                <img src="${otherUser.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <div>
                    <div style="font-weight: 700; font-size: 16px;">${otherUser.displayName} ${this.getBadgeHTML(otherUser)}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">@${otherUser.username}</div>
                </div>
            </div>
        `;

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div style="display: flex; flex-direction: column; height: calc(100vh - 130px);">
                <div id="messagesList" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                    ${messages.length === 0 ? '<p style="color: var(--text-secondary); text-align: center; margin-top: 40px;">No messages yet. Start the conversation!</p>' : messages.map(msg => {
                        const isSender = msg.senderId === currentUser.id;
                        return `
                            <div style="display: flex; justify-content: ${isSender ? 'flex-end' : 'flex-start'}; align-items: flex-end; gap: 8px;">
                                ${!isSender ? `<img src="${otherUser.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : ''}
                                <div style="max-width: 70%; background: ${isSender ? 'var(--twitter-blue)' : 'var(--bg-secondary)'}; color: ${isSender ? 'white' : 'var(--text-primary)'}; padding: 12px 16px; border-radius: 20px; word-wrap: break-word;">
                                    <div>${msg.text}</div>
                                    <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">${this.formatTime(msg.timestamp)}</div>
                                </div>
                                ${isSender ? `<img src="${currentUser.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="padding: 16px; border-top: 1px solid var(--border-color); background: var(--bg-primary);">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <input type="text" id="messageInput" placeholder="Type a message..." style="flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 24px; padding: 12px 16px; color: var(--text-primary); outline: none; font-size: 15px;" onkeypress="if(event.key === 'Enter') app.sendDirectMessage(${otherUserId})">
                        <button onclick="app.sendDirectMessage(${otherUserId})" style="background: var(--twitter-blue); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--twitter-blue-hover)'" onmouseout="this.style.background='var(--twitter-blue)'">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }

    async sendDirectMessage(receiverId) {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value.trim();
        
        if (!text) {
            Toast.error('Please enter a message');
            return;
        }

        const currentUser = this.db.getCurrentUser();
        const receiver = this.db.getAccount(receiverId);

        if (!receiver.privacySettings.allowDirectMessages) {
            Toast.error('This user has disabled direct messages');
            return;
        }

        try {
            await this.db.sendMessage(currentUser.id, receiverId, text);
            messageInput.value = '';
            Toast.success('Message sent!');
            this.renderConversation(receiverId);
        } catch (error) {
            Toast.error('Failed to send message');
        }
    }

    renderSettings() {
        const currentUser = this.db.getCurrentUser();
        const mainContent = document.getElementById('mainContent');
        const memoryPosts = this.db.getMemoryPosts(currentUser.id);
        const isAdmin = currentUser.username.toLowerCase() === 'alz' || currentUser.isAdmin === true;

        mainContent.innerHTML = `
            <div style="max-width: 680px; margin: 0 auto; padding: 16px;">

                <!-- Account Settings -->
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--twitter-blue);">
                        <i class="fas fa-user-circle"></i>
                        Account Settings
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px;">Display Name</label>
                            <input type="text" id="settingsDisplayName" value="${currentUser.displayName}" style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px;">Username</label>
                            <input type="text" id="settingsUsername" value="${currentUser.username}" style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px;">Bio</label>
                            <textarea id="settingsBio" rows="2" style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px; resize: vertical;">${currentUser.bio}</textarea>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px;">Profile Picture URL</label>
                            <input type="url" id="settingsAvatar" value="${currentUser.avatar}" style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px;">
                            <img src="${currentUser.avatar}" style="width: 60px; height: 60px; border-radius: 50%; margin-top: 10px; object-fit: cover; border: 2px solid var(--border-color);">
                        </div>
                        <button data-action="save-settings" style="background: var(--twitter-blue); color: white; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 8px;">Save Changes</button>
                    </div>
                </div>

                <!-- Privacy & Security -->
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--twitter-blue);">
                        <i class="fas fa-shield-alt"></i>
                        Privacy & Security
                    </h3>
                    
                    <!-- Privacy Settings -->
                    <div style="margin-bottom: 20px;">
                        <p style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">Privacy Controls</p>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                            <label style="font-size: 14px;">Allow others to follow me</label>
                            <input type="checkbox" id="allowFollow" ${currentUser.privacySettings?.allowFollowRequests !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                            <label style="font-size: 14px;">Allow direct messages</label>
                            <input type="checkbox" id="allowDM" ${currentUser.privacySettings?.allowDirectMessages !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                            <label style="font-size: 14px;">Show my activity</label>
                            <input type="checkbox" id="showActivity" ${currentUser.privacySettings?.showActivity !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0;">
                            <label style="font-size: 14px;">Show last online status</label>
                            <input type="checkbox" id="showLastOnline" ${currentUser.privacySettings?.showLastOnline !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        </div>
                        <button data-action="save-privacy" style="background: var(--twitter-blue); color: white; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%; margin-top: 12px;">Save Privacy Settings</button>
                    </div>
                    
                    <!-- Security Settings -->
                    <div>
                        <p style="font-weight: 600; margin-bottom: 12px; font-size: 14px;">Security</p>
                        <input type="password" id="settingsPassword" placeholder="Enter new password" style="width: 100%; padding: 10px 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 14px; margin-bottom: 12px;">
                        <button data-action="change-password" style="background: var(--twitter-blue); color: white; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%;">Update Password</button>
                    </div>
                </div>

                <!-- Quick Access -->
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--twitter-blue);">
                        <i class="fas fa-bolt"></i>
                        Quick Access
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button onclick="app.switchView('messages')" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="far fa-envelope"></i> Messages
                        </button>
                        <button onclick="app.switchView('confessions')" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-user-secret"></i> Thoughts
                        </button>
                        ${isAdmin ? `
                            <button onclick="app.switchView('admin')" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; grid-column: span 2;">
                                <i class="fas fa-shield-alt"></i> Admin Panel
                            </button>
                        ` : ''}
                    </div>
                </div>

                ${memoryPosts.length > 0 ? `
                    <!-- Features -->
                    <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--twitter-blue);">
                            <i class="fas fa-clock"></i>
                            Memory Lane
                        </h3>
                        <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">You have ${memoryPosts.length} ${memoryPosts.length === 1 ? 'memory' : 'memories'} from the past</p>
                        <button onclick="app.switchView('memories')" style="background: var(--twitter-blue); color: white; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%;">View Memories</button>
                    </div>
                ` : ''}

                <!-- Data & Privacy -->
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 12px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--twitter-blue);">
                        <i class="fas fa-database"></i>
                        Your Data
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">Download or view all your data stored on XVO</p>
                    <button onclick="app.showMyData()" style="background: var(--twitter-blue); color: white; border: none; border-radius: 20px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%;">View & Download My Data</button>
                </div>

                <!-- Account Actions -->
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 80px;">
                    <button data-action="logout" style="background: var(--danger); color: white; border: none; border-radius: 20px; padding: 12px 20px; font-size: 14px; font-weight: 700; cursor: pointer; width: 100%;">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        `;
    }

    async saveSettings() {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.isSuspended) {
            Toast.error('You are suspended and cannot change your profile');
            return;
        }

        currentUser.displayName = document.getElementById('settingsDisplayName').value;
        currentUser.username = document.getElementById('settingsUsername').value;
        currentUser.bio = document.getElementById('settingsBio').value;
        currentUser.avatar = document.getElementById('settingsAvatar').value || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';

        await this.db.updateAccount(currentUser);
        this.updateSidebar();
        this.addAdminNavIfNeeded();
        Toast.success('Settings saved!');
    }

    async savePrivacySettings() {
        const currentUser = this.db.getCurrentUser();
        if (!currentUser.privacySettings) {
            currentUser.privacySettings = {};
        }
        currentUser.privacySettings.allowFollowRequests = document.getElementById('allowFollow').checked;
        currentUser.privacySettings.allowDirectMessages = document.getElementById('allowDM').checked;
        currentUser.privacySettings.showActivity = document.getElementById('showActivity').checked;
        currentUser.privacySettings.showLastOnline = document.getElementById('showLastOnline').checked;

        await this.db.updateAccount(currentUser);
        Toast.success('Privacy settings updated!');
    }

    showMyData() {
        const currentUser = this.db.getCurrentUser();
        const userPosts = this.db.getUserPosts(currentUser.id);
        const notifications = this.db.getNotifications().filter(n => n.userId === currentUser.id);

        const dataInfo = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██╗  ██╗██╗   ██╗ ██████╗                              ║
║   ╚██╗██╔╝██║   ██║██╔═══██╗                             ║
║    ╚███╔╝ ██║   ██║██║   ██║                             ║
║    ██╔██╗ ╚██╗ ██╔╝██║   ██║                             ║
║   ██╔╝ ██╗ ╚████╔╝ ╚██████╔╝                             ║
║   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝                              ║
║                                                           ║
║          🔒 THE POWER OF PRIVACY 🔒                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 ACCOUNT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Name: ${currentUser.name}
🔖 Username: @${currentUser.username}
✨ Display Name: ${currentUser.displayName}
📝 Bio: ${currentUser.bio || 'Not set'}
🖼️  Avatar: ${currentUser.avatar}
👥 Followers: ${this.formatFollowerCount(currentUser.followers.length)}
🔗 Following: ${this.formatFollowerCount(currentUser.following.length)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ACTIVITY STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📮 Total Posts: ${userPosts.length}
🔔 Notifications: ${notifications.length}
❤️  Total Likes: ${userPosts.reduce((sum, p) => sum + p.likes.length, 0)}
🔄 Total Retweets: ${userPosts.reduce((sum, p) => sum + p.retweets.length, 0)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY & SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Follow Requests: ${currentUser.privacySettings?.allowFollowRequests !== false ? '✓ Enabled' : '✗ Disabled'}
✅ Direct Messages: ${currentUser.privacySettings?.allowDirectMessages !== false ? '✓ Enabled' : '✗ Disabled'}
✅ Show Activity: ${currentUser.privacySettings?.showActivity !== false ? '✓ Enabled' : '✗ Disabled'}
✅ Show Last Online: ${currentUser.privacySettings?.showLastOnline !== false ? '✓ Enabled' : '✗ Disabled'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ VERIFICATION STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${currentUser.verifiedID ? '✓ VERIFIED ACCOUNT' : '✗ Not Verified'}
${currentUser.badge ? `🏆 Badge: ${currentUser.badge.toUpperCase()}` : ''}
${currentUser.isAdmin ? '👑 Admin Status: Active' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated: ${new Date().toLocaleString()}
Your privacy is our priority. XVO - Where Your Voice Matters.

╚═══════════════════════════════════════════════════════════╝
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                    <h3 class="modal-title">My Data Export</h3>
                </div>
                <div class="modal-body">
                    <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; background: var(--bg-primary); padding: 20px; border-radius: 8px; color: var(--text-primary);">${dataInfo}</pre>
                    <button class="submit-btn" onclick="
                        const text = this.previousElementSibling.textContent;
                        const blob = new Blob([text], {type: 'text/plain'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'XVO_Data_Export_${new Date().toISOString().split('T')[0]}.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                    " style="margin-top: 16px; width: 100%;">
                        <i class="fas fa-download"></i> Download My Data
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    requestVerification() {
        const currentUser = this.db.getCurrentUser();
        
        if (currentUser.followers.length < 50000) {
            Toast.error(`You need 50,000 followers to request verification. You currently have ${currentUser.followers.length} followers.`);
            return;
        }
        
        if (currentUser.verificationRequested) {
            Toast.info('Your verification request is pending admin approval');
            return;
        }
        
        currentUser.verificationRequested = true;
        this.db.updateAccount(currentUser);
        Toast.success('Verification request submitted! Awaiting admin approval.');
    }

    async changePassword() {
        const newPassword = document.getElementById('settingsPassword').value;
        if (!newPassword) {
            Toast.error('Please enter a new password');
            return;
        }

        const currentUser = this.db.getCurrentUser();

        try {
            const response = await fetch(`${this.db.apiUrl}/api/accounts/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentUser, password: newPassword })
            });

            if (!response.ok) {
                throw new Error('Failed to update password');
            }

            const updatedAccount = await response.json();
            const accounts = this.db.getAccounts();
            const index = accounts.findIndex(a => a.id === currentUser.id);
            if (index !== -1) {
                accounts[index] = updatedAccount;
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }

            document.getElementById('settingsPassword').value = '';
            Toast.success('Password updated!');
        } catch (error) {
            Toast.error('Failed to update password');
        }
    }

    logout() {
        this.db.logout();
        location.reload();
    }

    updateNotificationBadge() {
        const currentUser = this.db.getCurrentUser();
        const unreadCount = this.db.getNotifications().filter(n => n.userId === currentUser.id && !n.read).length;

        const badge = document.querySelector('.notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = unreadCount;
                badge.style.background = 'var(--twitter-blue)';
                badge.style.color = 'white';
                badge.style.borderRadius = '10px';
                badge.style.padding = '2px 6px';
                badge.style.fontSize = '11px';
                badge.style.fontWeight = '700';
                badge.style.marginLeft = '8px';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    formatTime(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    formatFollowerCount(count) {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    getOnlineStatus(user) {
        if (!user.privacySettings?.showLastOnline) {
            return '';
        }
        
        if (!user.lastOnline) {
            return '';
        }
        
        const now = Date.now();
        const diff = now - user.lastOnline;
        
        // Active if last seen within 2 minutes
        if (diff < 120000) {
            return '<div style="color: #00ba7c; font-size: 13px; display: flex; align-items: center; gap: 6px; margin-top: 4px;"><span style="width: 8px; height: 8px; background: #00ba7c; border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span><strong>Active now</strong></div>';
        }
        
        // Format last seen time
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        let timeText = '';
        if (minutes < 60) {
            timeText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (hours < 24) {
            timeText = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            timeText = `${days} day${days !== 1 ? 's' : ''}`;
        }
        
        return `<div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;"><strong>Last seen:</strong> ${timeText} ago</div>`;
    }

    linkify(text) {
        return text.replace(/#(\w+)/g, '<span style="color: var(--twitter-blue); cursor: pointer;" data-action="search-hashtag" data-tag="$1">#$1</span>');
    }

    searchHashtag(tag) {
        this.switchView('search', '#' + tag);
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '#' + tag;
                this.performSearch('#' + tag);
            }
        }, 100);
    }

    showEmojiPicker(composer) {
        this.activeComposer = composer;
        document.getElementById('emojiModal').style.display = 'flex';
    }

    insertEmoji(emoji) {
        const textareaId = this.activeComposer + 'Composer';
        const textarea = document.getElementById(textareaId);
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);
        textarea.value = textBefore + emoji + textAfter;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = cursorPos + emoji.length;
        document.getElementById('emojiModal').style.display = 'none';
    }

    showLocationPicker(composer) {
        this.activeComposer = composer;
        document.getElementById('locationInput').value = '';
        document.getElementById('locationModal').style.display = 'flex';
    }

    triggerImageUpload(composer) {
        this.activeComposer = composer;
        document.getElementById(composer + 'ImageUpload').click();
    }

    setupImageUploadListener(composer) {
        const fileInput = document.getElementById(composer + 'ImageUpload');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 9 * 1024 * 1024 * 1024) {
                Toast.error('Image size must be less than 9GB');
                fileInput.value = '';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                Toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
                fileInput.value = '';
                return;
            }

            const progressDiv = document.getElementById(composer + 'UploadProgress');
            progressDiv.innerHTML = '<p style="color: var(--twitter-blue); margin-left: 52px;">Uploading...</p>';

            try {
                const result = await this.db.uploadImage(file);

                const imagePreviewDiv = document.getElementById(composer + 'ImagePreview');
                imagePreviewDiv.innerHTML = `
                    <div class="image-preview">
                        <img src="${result.url}" alt="Preview">
                        <button class="image-preview-remove" onclick="this.parentElement.parentElement.innerHTML=''; this.parentElement.parentElement.removeAttribute('data-image-url');">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                imagePreviewDiv.dataset.imageUrl = result.url;

                progressDiv.innerHTML = '';
                fileInput.value = '';
                Toast.success('Image uploaded successfully!');
            } catch (error) {
                progressDiv.innerHTML = '';
                Toast.error(error.message || 'Failed to upload image. Please try again.');
            }
        });
    }

    renderConfessions() {
        const mainContent = document.getElementById('mainContent');
        const currentUser = this.db.getCurrentUser();

        mainContent.innerHTML = `
            <div class="composer">
                <div class="composer-inner">
                    <i class="fas fa-user-secret" style="font-size: 32px; color: var(--text-secondary);"></i>
                    <textarea placeholder="Share your thoughts anonymously..." id="confessionText" style="flex: 1;"></textarea>
                </div>
                <div class="composer-actions">
                    <div style="color: var(--text-secondary); font-size: 13px;">Posted anonymously - no one will know it's you</div>
                    <button class="post-submit" data-action="post-confession">Post Anonymously</button>
                </div>
            </div>
            <div id="confessionsFeed" class="feed"></div>
        `;

        const confessions = this.db.getConfessions();
        const container = document.getElementById('confessionsFeed');

        if (confessions.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No anonymous thoughts yet. Be the first to share!</p>';
            return;
        }

        container.innerHTML = confessions.map(confession => `
            <div class="post">
                <div class="post-inner">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-secret" style="color: var(--text-secondary);"></i>
                    </div>
                    <div class="post-content">
                        <div class="post-header">
                            <span class="post-name">Anonymous</span>
                            <span class="post-dot">·</span>
                            <span class="post-time">${this.formatTime(confession.timestamp)}</span>
                        </div>
                        <div class="post-text">${confession.text}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    postConfession() {
        const textarea = document.getElementById('confessionText');
        const text = textarea.value.trim();

        if (!text) {
            Toast.error('Please write something to post');
            return;
        }

        this.db.addConfession({ text });
        textarea.value = '';
        Toast.success('Anonymous thought posted!');
        this.renderConfessions();
    }

    renderMemories() {
        const currentUser = this.db.getCurrentUser();
        const memoryPosts = this.db.getMemoryPosts(currentUser.id);
        const mainContent = document.getElementById('mainContent');

        if (memoryPosts.length === 0) {
            mainContent.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No memories from this day in previous months or years!</p>';
            return;
        }

        mainContent.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
                <h3 style="font-size: 18px; margin-bottom: 8px;">On this day...</h3>
                <p style="color: var(--text-secondary);">Posts you made on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} in previous times</p>
            </div>
            <div id="memoryFeed" class="feed"></div>
        `;

        this.renderFeed('memoryFeed', memoryPosts);
    }

    checkMemoryLane() {
        const currentUser = this.db.getCurrentUser();
        const memoryPosts = this.db.getMemoryPosts(currentUser.id);

        if (memoryPosts.length > 0) {
            setTimeout(() => {
                Toast.info(`You have ${memoryPosts.length} memory${memoryPosts.length > 1 ? 'ies' : ''} from this day! Check Memory Lane.`);
            }, 2000);
        }
    }

    renderStories() {
        const mainContent = document.getElementById('mainContent');
        const currentUser = this.db.getCurrentUser();
        const userStory = this.db.getUserStory(currentUser.id);

        mainContent.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: flex-start; gap: 16px;">
                    <div style="position: relative;">
                        <img src="${currentUser.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        ${userStory ? '' : '<div style="position: absolute; bottom: 0; right: 0; background: var(--twitter-blue); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg-primary); cursor: pointer;" data-action="create-story"><i class="fas fa-plus" style="font-size: 10px; color: white;"></i></div>'}
                    </div>
                    ${userStory ? `
                        <div class="thought-bubble">
                            <div class="thought-bubble-content">${userStory.text}</div>
                            <div style="color: var(--text-secondary); font-size: 12px; margin-top: 8px;">${this.formatTime(userStory.timestamp)}</div>
                        </div>
                    ` : `
                        <div style="flex: 1;">
                            <textarea id="storyInput" placeholder="What's on your mind?" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px; color: var(--text-primary); font-size: 15px; resize: none; outline: none; font-family: inherit; min-height: 80px;"></textarea>
                            <button class="post-submit" data-action="create-story" style="margin-top: 8px;">Share Thought</button>
                        </div>
                    `}
                </div>
            </div>
            <div id="storiesFeed" style="padding: 20px;">
                <h3 style="margin-bottom: 16px; font-size: 18px;">Friends' Stories</h3>
                <div id="friendsStories"></div>
            </div>
        `;

        this.renderFriendsStories();
    }

    renderFriendsStories() {
        const container = document.getElementById('friendsStories');
        if (!container) return;

        const currentUser = this.db.getCurrentUser();
        const stories = this.db.getStories();
        const friendsStories = stories.filter(s => currentUser.following.includes(s.userId));

        if (friendsStories.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No stories from friends yet</p>';
            return;
        }

        container.innerHTML = friendsStories.map(story => {
            const author = this.db.getAccount(story.userId);
            return `
                <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; cursor: pointer;" data-user-id="${author.id}">
                    <img src="${author.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; margin-bottom: 4px;">${author.displayName}${this.getBadgeHTML(author)}</div>
                        <div class="thought-bubble">
                            <div class="thought-bubble-content">${story.text}</div>
                            <div style="color: var(--text-secondary); font-size: 12px; margin-top: 8px;">${this.formatTime(story.timestamp)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupProfilePicUpload() {
        const fileInput = document.getElementById('profilePicUpload');
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 9 * 1024 * 1024 * 1024) {
                Toast.error('Image size must be less than 9GB');
                fileInput.value = '';
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                Toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
                fileInput.value = '';
                return;
            }

            try {
                Toast.info('Uploading profile picture...');
                const result = await this.db.uploadImage(file);

                const currentUser = this.db.getCurrentUser();
                currentUser.avatar = result.url;
                this.db.updateAccount(currentUser);

                document.getElementById('profileAvatarImage').src = result.url;
                document.getElementById('sidebarAvatar').src = result.url;

                fileInput.value = '';
                Toast.success('Profile picture updated successfully!');
            } catch (error) {
                Toast.error(error.message || 'Failed to upload profile picture. Please try again.');
            }
        });
    }

    renderProfileStories(userId) {
        const user = this.db.getAccount(userId);
        const currentUser = this.db.getCurrentUser();
        const isOwnProfile = user.id === currentUser.id;
        const userStory = this.db.getUserStory(userId);

        const content = document.getElementById('profileTabContent');
        content.innerHTML = `
            ${isOwnProfile && !userStory ? `
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <img src="${currentUser.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        <div style="flex: 1;">
                            <textarea id="storyInput" placeholder="What's on your mind?" style="width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px; color: var(--text-primary); font-size: 15px; resize: none; outline: none; font-family: inherit; min-height: 80px;"></textarea>
                            <button class="post-submit" data-action="create-story" style="margin-top: 8px;">Share Thought</button>
                        </div>
                    </div>
                </div>
            ` : ''}
            ${userStory ? `
                <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: flex-start; gap: 16px;">
                        <img src="${user.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                        <div class="thought-bubble">
                            <div class="thought-bubble-content">${userStory.text}</div>
                            <div style="color: var(--text-secondary); font-size: 12px; margin-top: 8px;">${this.formatTime(userStory.timestamp)}</div>
                        </div>
                    </div>
                </div>
            ` : '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No story yet</p>'}
        `;
    }

    renderProfilePosts(userId) {
        const currentUser = this.db.getCurrentUser();
        const isOwnProfile = userId === currentUser.id;
        const userPosts = this.db.getUserPosts(userId);

        const content = document.getElementById('profileTabContent');
        content.innerHTML = `
            ${isOwnProfile ? `
                <div class="composer">
                    <div class="composer-inner">
                        <img src="${currentUser.avatar}" class="user-avatar">
                        <textarea placeholder="What's happening?" id="profileComposer"></textarea>
                    </div>
                    <div id="profileLocation"></div>
                    <div id="profileImagePreview"></div>
                    <div id="profileUploadProgress"></div>
                    <div class="composer-actions">
                        <div class="composer-icons">
                            <i class="far fa-image" data-action="upload-image" data-composer="profile"></i>
                            <i class="fas fa-map-marker-alt" data-action="add-location" data-composer="profile"></i>
                            <i class="far fa-smile" data-action="add-emoji" data-composer="profile"></i>
                        </div>
                        <button class="post-submit" data-action="create-post" data-textarea-id="profileComposer">Post</button>
                    </div>
                    <input type="file" id="profileImageUpload" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" style="display: none;">
                </div>
            ` : ''}
            <div id="profileFeed" class="feed"></div>
        `;

        this.renderFeed('profileFeed', userPosts);

        if (isOwnProfile) {
            this.setupImageUploadListener('profile');
        }
    }

    renderAdminPanel() {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz' && !currentUser.isAdmin) {
            Toast.error('Access denied. Admin only.');
            this.switchView('home');
            return;
        }

        const mainContent = document.getElementById('mainContent');
        const allUsers = this.db.getAccounts();
        const verificationRequests = allUsers.filter(u => u.verificationRequested && !u.verifiedID && u.id !== currentUser.id);
        const suspendedUsers = allUsers.filter(u => u.isSuspended);
        const adminUsers = allUsers.filter(u => u.isAdmin);

        mainContent.innerHTML = `
            <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
                
                ${verificationRequests.length > 0 ? `
                    <div style="background: var(--bg-secondary); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 16px; font-size: 20px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-check-circle" style="color: var(--twitter-blue);"></i>
                            Verification Requests
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${verificationRequests.map(user => `
                                <div style="padding: 12px; border: 1px solid var(--twitter-blue); border-radius: 12px; background: rgba(29, 155, 240, 0.05);">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <img src="${user.avatar}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 700;">${user.displayName}</div>
                                            <div style="color: var(--text-secondary);">@${user.username}</div>
                                            <div style="color: var(--text-secondary); font-size: 12px;">${this.formatFollowerCount(user.followers.length)} followers</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="action-btn" onclick="app.approveVerification(${user.id})" style="background: var(--twitter-blue); color: white; padding: 8px 16px; border-radius: 20px; flex: 1;">
                                            Approve
                                        </button>
                                        <button class="action-btn" onclick="app.denyVerification(${user.id})" style="background: var(--danger); color: white; padding: 8px 16px; border-radius: 20px; flex: 1;">
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${suspendedUsers.length > 0 ? `
                    <div style="background: var(--bg-secondary); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 16px; font-size: 20px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-ban" style="color: var(--danger);"></i>
                            Suspended Users
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${suspendedUsers.map(user => `
                                <div style="padding: 12px; border: 1px solid var(--danger); border-radius: 12px; background: rgba(244, 33, 46, 0.05);">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <img src="${user.avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 700;">${user.displayName}</div>
                                            <div style="color: var(--text-secondary);">@${user.username}</div>
                                        </div>
                                        <button class="action-btn" data-action="suspend-user" data-user-id="${user.id}" style="background: var(--twitter-blue); color: white; padding: 6px 16px; border-radius: 20px;">
                                            Unsuspend
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${currentUser.username.toLowerCase() === 'alz' && adminUsers.length > 0 ? `
                    <div style="background: var(--bg-secondary); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="margin-bottom: 16px; font-size: 20px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-user-shield" style="color: var(--twitter-blue);"></i>
                            Admin Users
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${adminUsers.map(user => `
                                <div style="padding: 12px; border: 1px solid var(--twitter-blue); border-radius: 12px; background: rgba(29, 155, 240, 0.05);">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <img src="${user.avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 700;">${user.displayName}${this.getBadgeHTML(user)}</div>
                                            <div style="color: var(--text-secondary);">@${user.username}</div>
                                        </div>
                                        <button class="action-btn" data-action="toggle-admin" data-user-id="${user.id}" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 16px; border-radius: 20px;">
                                            Remove Admin
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="background: var(--bg-secondary); border-radius: 16px; padding: 20px;">
                    <h3 style="margin-bottom: 16px; font-size: 20px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users" style="color: var(--twitter-blue);"></i>
                        All Users
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${allUsers.map(user => `
                            <div style="padding: 16px; border: 1px solid var(--border-color); border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <img src="${user.avatar}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 700;">${user.displayName}${this.getBadgeHTML(user)}</div>
                                        <div style="color: var(--text-secondary);">@${user.username}</div>
                                        <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
                                            ${this.formatFollowerCount(user.followers.length)} followers
                                            ${user.isSuspended ? ' • <span style="color: var(--danger); font-weight: 700;">SUSPENDED</span>' : ''}
                                            ${user.isAdmin ? ' • <span style="color: var(--twitter-blue); font-weight: 700;">ADMIN</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    ${!user.isSuspended ? `
                                        <button class="action-btn" data-action="suspend-user" data-user-id="${user.id}" style="background: var(--danger); color: white; padding: 8px 16px; border-radius: 20px;">
                                            Suspend
                                        </button>
                                    ` : ''}
                                    ${currentUser.username.toLowerCase() === 'alz' ? `
                                        ${!user.isAdmin ? `
                                            <button class="action-btn" data-action="toggle-admin" data-user-id="${user.id}" style="background: var(--twitter-blue); color: white; padding: 8px 16px; border-radius: 20px;">
                                                Make Admin
                                            </button>
                                        ` : ''}
                                        <select onchange="if(this.value) { app.assignBadge(${user.id}, this.value); this.value=''; }" style="background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 20px; cursor: pointer;">
                                            <option value="">Assign Badge</option>
                                            <option value="blue">Blue Badge</option>
                                            <option value="black">Black Badge</option>
                                            <option value="grey">Grey Badge</option>
                                            <option value="gold">Gold Badge</option>
                                            ${user.badge ? '<option value="none">Remove Badge</option>' : ''}
                                        </select>
                                        <div style="display: flex; gap: 8px; width: 100%; margin-top: 8px;">
                                            <input type="number" id="followers-${user.id}" placeholder="Add followers" style="flex: 1; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 20px; font-size: 14px;" min="1">
                                            <button class="action-btn" onclick="app.giveFollowers(${user.id})" style="background: var(--twitter-blue); color: white; padding: 8px 20px; border-radius: 20px; white-space: nowrap;">
                                                Add
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async toggleSuspendUser(userId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz' && !currentUser.isAdmin) {
            Toast.error('Access denied. Admin only.');
            return;
        }

        const user = this.db.getAccount(userId);
        user.isSuspended = !user.isSuspended;
        await this.db.updateAccount(user);

        Toast.success(user.isSuspended ? 'User suspended' : 'User unsuspended');
        this.renderAdminPanel();
    }

    async assignBadge(userId, badge) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz') {
            Toast.error('Only Alz can assign badges');
            return;
        }

        const user = this.db.getAccount(userId);
        user.badge = badge === 'none' ? null : badge;
        user.badgeIssuedBy = badge === 'none' ? null : 'Alz';
        await this.db.updateAccount(user);

        Toast.success(badge === 'none' ? 'Badge removed' : `${badge.charAt(0).toUpperCase() + badge.slice(1)} badge assigned!`);
        this.renderAdminPanel();
    }

    async toggleAdmin(userId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz') {
            Toast.error('Only Alz can assign admin privileges');
            return;
        }

        const user = this.db.getAccount(userId);
        user.isAdmin = !user.isAdmin;
        await this.db.updateAccount(user);

        Toast.success(user.isAdmin ? 'Admin privileges granted' : 'Admin privileges revoked');
        this.renderAdminPanel();
    }

    async approveVerification(userId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz' && !currentUser.isAdmin) {
            Toast.error('Only admins can approve verification');
            return;
        }

        const user = this.db.getAccount(userId);
        user.verifiedID = true;
        user.verificationRequested = false;
        await this.db.updateAccount(user);

        this.db.addNotification({
            type: 'verification_approved',
            userId: userId,
            fromUserId: currentUser.id
        });

        Toast.success(`Verification approved for @${user.username}`);
        this.renderAdminPanel();
    }

    async denyVerification(userId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz' && !currentUser.isAdmin) {
            Toast.error('Only admins can deny verification');
            return;
        }

        const user = this.db.getAccount(userId);
        user.verificationRequested = false;
        await this.db.updateAccount(user);

        this.db.addNotification({
            type: 'verification_denied',
            userId: userId,
            fromUserId: currentUser.id
        });

        Toast.success(`Verification denied for @${user.username}`);
        this.renderAdminPanel();
    }

    async giveFollowers(userId) {
        const currentUser = this.db.getCurrentUser();

        if (currentUser.username.toLowerCase() !== 'alz') {
            Toast.error('Only Alz can give followers');
            return;
        }

        const input = document.getElementById(`followers-${userId}`);
        const count = parseInt(input.value);

        if (!count || count <= 0) {
            Toast.error('Please enter a valid number of followers');
            return;
        }

        // Limit to 5000 followers at once to prevent crashes
        const batchSize = Math.min(count, 5000);
        const user = this.db.getAccount(userId);
        
        const startId = user.followers.length > 0 ? Math.min(...user.followers, 0) - 1 : -1;
        const newFollowers = Array.from({ length: batchSize }, (_, i) => startId - i);
        
        user.followers = [...user.followers, ...newFollowers];
        
        try {
            await this.db.updateAccount(user);
            
            Toast.success(`Added ${this.formatFollowerCount(batchSize)} followers to @${user.username}!`);
            if (count > 5000) {
                Toast.info(`Maximum 5,000 followers added per request. You requested ${this.formatFollowerCount(count)}.`);
            }
            input.value = '';
            
            setTimeout(() => this.renderAdminPanel(), 300);
        } catch (error) {
            console.error('Error syncing followers to server:', error);
            Toast.error('Failed to update followers. Please try again.');
        }
    }

    createStory() {
        const textarea = document.getElementById('storyInput');
        const text = textarea?.value.trim();

        if (!text) {
            Toast.error('Please write something to share');
            return;
        }

        const currentUser = this.db.getCurrentUser();
        const story = {
            userId: currentUser.id,
            text: text
        };

        this.db.addStory(story);
        Toast.success('Story shared!');
        this.renderStories();
    }

    showCommentsModal(postId) {
        const post = this.db.getPost(postId);
        const currentUser = this.db.getCurrentUser();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'commentsModal';
        modal.style.display = 'flex';
        
        const commentsHTML = (post.comments || []).map(comment => {
            const author = this.db.getAccount(comment.userId);
            const isOwnComment = comment.userId === currentUser.id;
            
            return `
                <div class="comment-item">
                    <div style="display: flex; gap: 12px;">
                        <img src="${author.avatar}" class="user-avatar" data-user-id="${author.id}" style="cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                                <span class="post-name" data-user-id="${author.id}" style="cursor: pointer; font-weight: 700;">${author.displayName}${this.getBadgeHTML(author)}</span>
                                <span style="color: var(--text-secondary);">@${author.username}</span>
                                <span style="color: var(--text-secondary);">·</span>
                                <span style="color: var(--text-secondary); font-size: 14px;">${this.formatTime(comment.timestamp)}</span>
                                ${isOwnComment ? `<i class="fas fa-trash" style="margin-left: auto; cursor: pointer; color: var(--text-secondary); font-size: 14px;" data-action="delete-comment" data-post-id="${postId}" data-comment-id="${comment.id}"></i>` : ''}
                            </div>
                            <div style="color: var(--text-primary);">${comment.text}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 90vh; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <button class="modal-close" onclick="document.getElementById('commentsModal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                    <h3 class="modal-title">Comments</h3>
                </div>
                <div class="modal-body" style="flex: 1; overflow-y: auto;">
                    ${(post.comments || []).length === 0 ? '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No comments yet. Be the first to comment!</p>' : commentsHTML}
                </div>
                <div style="border-top: 1px solid var(--border-color); padding: 16px;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <img src="${currentUser.avatar}" class="user-avatar">
                        <textarea id="commentInput" placeholder="Add a comment..." style="flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; color: var(--text-primary); font-size: 15px; resize: none; outline: none; font-family: inherit; min-height: 60px;"></textarea>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                        <button class="post-submit" data-action="add-comment" data-post-id="${postId}">Comment</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async addCommentToPost(postId) {
        const textarea = document.getElementById('commentInput');
        const text = textarea.value.trim();
        
        if (!text) {
            Toast.error('Please enter a comment');
            return;
        }
        
        const currentUser = this.db.getCurrentUser();
        
        if (currentUser.isSuspended) {
            Toast.error('You are suspended and cannot comment');
            return;
        }
        
        try {
            await this.db.addComment(postId, currentUser.id, text);
            textarea.value = '';
            Toast.success('Comment added!');
            
            document.getElementById('commentsModal').remove();
            this.showCommentsModal(postId);
            
            if (this.currentView === 'home') {
                this.renderFeed('homeFeed');
            } else if (this.currentView === 'profile') {
                this.renderFeed('profileFeed', this.db.getUserPosts(this.viewingUserId));
            }
            
            const post = this.db.getPost(postId);
            if (post.userId !== currentUser.id) {
                this.db.addNotification({
                    type: 'comment',
                    userId: post.userId,
                    fromUserId: currentUser.id,
                    postId: postId
                });
                this.updateNotificationBadge();
            }
        } catch (error) {
            Toast.error('Failed to add comment');
        }
    }

    async deleteCommentFromPost(postId, commentId) {
        try {
            await this.db.deleteComment(postId, commentId);
            Toast.success('Comment deleted');
            
            document.getElementById('commentsModal').remove();
            this.showCommentsModal(postId);
            
            if (this.currentView === 'home') {
                this.renderFeed('homeFeed');
            } else if (this.currentView === 'profile') {
                this.renderFeed('profileFeed', this.db.getUserPosts(this.viewingUserId));
            }
        } catch (error) {
            Toast.error('Failed to delete comment');
        }
    }
}

function addLocation(location) {
    const locationDiv = document.getElementById(app.activeComposer + 'Location');
    locationDiv.innerHTML = `
        <div class="location-tag" style="margin-left: 52px;">
            <i class="fas fa-map-marker-alt"></i>
            <span>${location}</span>
            <i class="fas fa-times" style="cursor: pointer; margin-left: 4px;" onclick="this.parentElement.remove()"></i>
        </div>
    `;
    document.getElementById('locationModal').style.display = 'none';
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});