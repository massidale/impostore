import {auth, database} from '../../../config/firebase';
import {createSparkTransport} from './sparkTransport';
export const roomConnection = createSparkTransport(database, () => auth.currentUser?.uid ?? null);
