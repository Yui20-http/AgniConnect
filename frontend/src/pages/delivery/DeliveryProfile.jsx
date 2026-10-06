import ProfileForm from '../../components/ProfileForm';
import KycVerificationForm from '../../components/KycVerificationForm';

/**
 * DeliveryProfile - delivery partner account + vehicle details.
 */
const DeliveryProfile = () => (
  <div className="space-y-6">
    <ProfileForm
      title="Delivery Partner Profile"
      subtitle="Manage your personal and vehicle details"
      extraFields={[
        { key: 'vehicleType', label: 'Vehicle Type', placeholder: 'e.g. Mini Truck / Bike' },
        { key: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'e.g. MH12 AB 1234' },
      ]}
    />
    <KycVerificationForm />
  </div>
);

export default DeliveryProfile;
