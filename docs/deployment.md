# Deploy AgriConnect with Render and MongoDB Atlas

This repository includes a Render Blueprint for one web service. The service
builds the React application and serves it from the Express backend, so the
website, API, and Socket.IO chat use the same HTTPS origin.

## Required accounts and settings

- A Render account connected to the `Yui20-http/AgniConnect` GitHub repository.
- The MongoDB Atlas connection string for `MONGODB_URI`.
- Cloudinary cloud name, API key, and API secret. Production startup requires
  these so farmer product photos are stored outside Render's temporary disk.
- MongoDB Atlas Network Access configured to allow the Render service to
  connect. Use Render's published outbound IP ranges for the Singapore region
  when configuring an IP access list.

## Create the deployment

1. In Render, create a new Blueprint and select this repository's `main` branch.
2. Review the service described by `render.yaml`.
3. Enter the Atlas URI and Cloudinary credentials when Render requests the
   unsynced environment variables. Render generates `JWT_SECRET` for the
   service.
4. Deploy the Blueprint, then open the service URL and check `/api/health`.

Never commit `.env` files or enter their contents in GitHub. Add optional
provider variables such as Razorpay and MSG91 in the Render service's private
Environment settings if those features are required. MSG91 delivery SMS also
requires an approved Flow template ID.

## Free service notes

The Blueprint uses Render's free web service. Free services can spin down after
15 minutes without traffic, so the first request after idle can take about a
minute. Their local filesystem is temporary; Cloudinary is required for
persistent uploaded images.
