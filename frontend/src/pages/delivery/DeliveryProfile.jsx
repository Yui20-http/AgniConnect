import ProfileForm from '../../components/ProfileForm';

/**
 * DeliveryProfile - delivery partner account + vehicle details.
 */
const DeliveryProfile = () => (
  <ProfileForm
    title="Delivery Partner Profile"
    subtitle="Manage your personal and vehicle details"
    extraFields={[
      { key: 'vehicleType', label: 'Vehicle Type', placeholder: 'e.g. Mini Truck / Bike' },
      { key: 'vehicleNumber', label: 'Vehicle Number', placeholder: 'e.g. MH12 AB 1234' },
    ]}
  />
);

export default DeliveryProfile;
