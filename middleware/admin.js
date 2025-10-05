import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { uploadVehicle, getAllBookings, promoteUser } from '../controllers/adminController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // or use Cloudinary

router.post('/vehicle', verifyToken, isAdmin, upload.single('image'), uploadVehicle);
router.get('/bookings', verifyToken, isAdmin, getAllBookings);
router.put('/promote/:id', verifyToken, isAdmin, promoteUser);

export default router;
