import ProfileForm from '../../components/ProfileForm';
import KycVerificationForm from '../../components/KycVerificationForm';

/**
 * BuyerProfile - buyer account details.
 */
const BuyerProfile = () => (
  <div className="space-y-6">
    <ProfileForm title="Buyer Profile" subtitle="Manage your personal and delivery details" />
    <KycVerificationForm />
  </div>
);

export default BuyerProfile;
