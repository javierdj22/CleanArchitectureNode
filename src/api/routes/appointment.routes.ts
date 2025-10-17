import { Router } from 'express';
import { createAppointment, getAppointments } from '../../controllers/appointment.controller';

const router = Router();

router.post('/appointments', createAppointment);
router.get('/appointments/:insuredId', getAppointments);

export default router;
