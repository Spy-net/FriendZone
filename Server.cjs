const mongoose = require('mongoose');
const express = require('express');
const moment = require('moment');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// IMPORTANT MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(helmet());

//DB COLLECTION SCHEMA
// 1."users"
const userSchema = new mongoose.Schema({
    Username: {
        type: String,
        required: true,
        description: "The username of the user.",
    },
    Email: {
        type: String,
        required: true,
        description: "The email address of the user.",
    },
    Password: {
        type: String,
        required: true,
        description: "The password of the user.",
    },
    College: {
        type: String,
        required: true,
        description: "The college or university of the user.",
    },
    "PhoneNo": {
        type: Number,
        required: false,
        description: "The phone number of the user (optional).",
    },
    Bio: {
        type: String,
        required: false,
        description: "A short bio or description of the user (optional).",
    },
    Address: {
        type: String,
        required: false,
        description: "The address of the user (optional).",
    },
    Image: {
        type: String,
        required: false,
        description: "The URL of the user's profile picture (optional).",
    },
    Created_at: {
        type: Date,
        required: true,
        description: "The date and time when the user account was created.",
    },
});
const UserModel = mongoose.model('users', userSchema);

// 2."projects"
const projectSchema = new mongoose.Schema({
    Title: {
        type: String,
        required: true,
    },
    Description: {
        type: String,
        required: true,
    },
    ClientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    FreelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    Status: {
        type: String,
        required: true,
        default: 'in progress',
    },
    Deadline: {
        type: Date,
        required: true,
    },
    Created_at: {
        type: Date,
        default: Date.now,
    },
    Category: {
        type: String,
        required: true,
    },
    Thumbnail: {
        type: String,
        default: null,
    },
});

const ProjectModel = mongoose.model('projects', projectSchema);

//DB CONNECTION 
mongoose.connect(process.env.MONGOODB_CONNECTION)
    .then((db) => {
        console.log('Connected to MongoDB');
        console.log(db.connections[0].name);
    })
    .catch(error => {
        console.error('Error connecting to MongoDB:', error);
    });

// SECRET KEY FOR JWT
const jwtSecret = process.env.JWT_SECRET || 'default_secret_key';

// PAGES CONTROLLER
//1.SIGN-UP
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password, college, phoneNo, bio, address, image } = req.body;


        if (password.length < 5 || password.length > 10) {
            return res.status(400).json({ message: 'Password must be between 5 and 10 characters long.' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,10}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Invalid password format. Include uppercase, lowercase, numbers, and special characters.'
            });
        }

        const existingUser = await UserModel.findOne({ Email: email });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email 🤔.' });
        }

        const newUser = new UserModel({
            Username: username,
            Email: email,
            Password: password,
            College: college,
            PhoneNo: phoneNo,
            Bio: bio,
            Address: address,
            Image: image,
            Created_at: new Date()
        });
        await newUser.save();

        console.log(`🙎New user signed up with email: ${email} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);
        res.status(201).json({ message: 'Signup successful 🥳' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Signup failed. Please try again 🫤.' });
    }
});
//2.LOGIN
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ Email: email });

        if (!user) {
            return res.status(404).json({ message: 'User not found 🙅‍♂️' });
        }

        if (user.Password !== password) {
            return res.status(401).json({ message: 'Incorrect password ❌' });
        }
        console.log(`👤 User logged in with email: ${email} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`);
        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful 🥳.', token, expiresIn: 3600 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'An error occurred during login. Please try again later 🫤.' });
    }
});

// 3.FORGOT PASSWORD
app.post('/forgot-password', async (req, res) => {
    try {
        const { email, username, newPassword } = req.body;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{5,10}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: 'Remember the Password Format. Its Between 5-10 using Az-Zz @$!%*?&.'
            });
        }
        const user = await UserModel.findOne({ Email: email });
        if (!user || user.Username !== username) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        user.Password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'An error occurred while resetting password' });
    }
});

// 4.GET USER DETAILS OF AUTHORIZED PERSON
app.get('/user', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found 🫤.' });
        }

        res.status(200).json({
            username: user.Username,
            email: user.Email,
            college: user.College,
            phoneNo: user.PhoneNo,
            bio: user.Bio,
            address: user.Address,
            image: user.Image,
            created_at: user.Created_at,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'An error occurred while fetching user data 🫤.' });
    }
});

app.get('/user-details/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            username: user.Username,
            email: user.Email,
            phoneNo: user.PhoneNo,
            profileImage: user.Image,
            bio: user.Bio
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'An error occurred while fetching user details' });
    }
});



// 5.GET USER EMAIL BY ID
app.get('/freelancer/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            email: user.Email,
        });
    } catch (error) {
        console.error('Error fetching user data by ID:', error);
        res.status(500).json({ message: 'An error occurred while fetching user data by ID' });
    }
});

app.get('/client/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            email: user.Email,
        });
    } catch (error) {
        console.error('Error fetching user data by ID:', error);
        res.status(500).json({ message: 'An error occurred while fetching user data by ID' });
    }
});

// 6.GET PROJECT DETAILS FOR USER
app.get('/user/projects', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const clientProjects = await ProjectModel.find({ ClientId: userId });
        const freelancerProjects = await ProjectModel.find({ FreelancerId: userId });

        // PROJECT DETAILS FOR USER AS CLIENT
        const ClientProjects = clientProjects.map((project) => ({
            _id: project._id,
            Title: project.Title,
            Description: project.Description,
            ClientId: project.ClientId,
            FreelancerId: project.FreelancerId,
            Status: project.Status,
            Deadline: project.Deadline,
            Category: project.Category,
            Created_at: project.Created_at,
            Thumbnail: project.Thumbnail,
        }));

        // PROJECT DETAILS FOR USER AS FREELANCER
        const FreelancerProjects = freelancerProjects.map((project) => ({
            _id: project._id,
            Title: project.Title,
            Description: project.Description,
            ClientId: project.ClientId,
            FreelancerId: project.FreelancerId,
            Status: project.Status,
            Deadline: project.Deadline,
            Category: project.Category,
            Created_at: project.Created_at,
            Thumbnail: project.Thumbnail,
        }));

        const allProjects = [...ClientProjects, ...FreelancerProjects];
        res.status(200).json(allProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'An error occurred while fetching projects 🫤.' });
    }
});


// 7.POSTING PROJECT 
app.post('/save_projects', authenticateToken, async (req, res) => {
    try {
        const { title, category, deadline, description, thumbnail } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const newProject = new ProjectModel({
            Title: title,
            Description: description,
            ClientId: userId,
            Deadline: new Date(deadline),
            Category: category,
            Thumbnail: thumbnail,
        });

        await newProject.save();
        res.status(201).json({ message: 'Project saved successfully ✅' });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ message: 'Error saving project 😯.' });
    }
});

// 8.GETTING PROJECTS FOR ALL
app.get('/projects', async (req, res) => {
    try {
        const projects = await ProjectModel.find();
        res.json(projects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error 💥' });
    }

});

// 9. ADDING INTERESTED PROJECT
app.post('/add_myProject', authenticateToken, async (req, res) => {
    try {
        const { projectId, userId } = req.body;
        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ClientId.toString() === userId) {
            return res.status(403).json({ message: 'Cannot add your own project' });
        }

        project.FreelancerId = userId;
        await project.save();
        res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Error updating project' });
    }
});


// 10. EXIT FROM PROJECT
app.patch('/user/projects/:projectId/exit', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ClientId.toString() === userId) {
            return res.status(403).json({ message: 'You cannot exit from your own project. Use the delete option to remove the project.' });
        }

        if (project.FreelancerId.toString() !== userId) {
            return res.status(403).json({ message: 'You are not a freelancer in this project.' });
        }

        project.FreelancerId = null;
        await project.save();
        res.status(200).json({ message: 'Exited from project successfully' });
    } catch (error) {
        console.error('Error exiting project:', error);
        res.status(500).json({ message: 'Error exiting project' });
    }
});

// 11. DELETE PROJECT
app.delete('/user/projects/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ClientId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to delete project' });
        }

        await project.deleteOne();
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Error deleting project' });
    }
});


// 12. UPDATE PROJECT STATUS TO COMPLETED
app.patch('/user/projects/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const project = await ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.ClientId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to update project' });
        }

        project.Status = 'Completed';
        await project.save();
        res.status(200).json({ message: 'Project status updated to Completed' });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ message: 'Error updating project status' });
    }
});

// 13. UPDATE USER DETAILS INCLUDING PROFILE IMAGE
app.patch('/user', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized 🚫' });
        }

        const { username, college, password, phoneNo, address, bio, image } = req.body;
        if (!username || !college) {
            return res.status(400).json({ message: 'Username and college are required fields.' });
        }

        const updatedUser = await UserModel.findByIdAndUpdate(userId, {
            Username: username,
            College: college,
            Password: password,
            PhoneNo: phoneNo,
            Address: address,
            Bio: bio,
            Image: image,
        }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ message: 'Error updating user data.' });
    }
});

// Middleware function to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Unauthorized 🚫' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden ⛔' });
        }
        req.user = user;
        next();
    });
}

// MIDDLEWARE FUNCTIONS FOR HANDLING ERRORS
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error ❌' });
});


// SERVER STARTING CODE
app.listen(PORT, () => {
    console.log(`🌐 Server is running 🚀 on port ${PORT}`);
});