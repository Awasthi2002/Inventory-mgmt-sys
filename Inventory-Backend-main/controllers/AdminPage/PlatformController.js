const Platform = require('../../models/Platform');

const createPlatform = async (req, res) => {
  try {
    const { name, reviewEnabled } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Platform name is required' });
    }

    // Create new platform
    const platform = new Platform({
      name: name.trim(),
      reviewEnabled: !!reviewEnabled
    });

    // Save to database
    await platform.save();

    res.status(201).json({
      message: 'Platform created successfully',
      platform: {
        id: platform._id,
        name: platform.name,
        reviewEnabled: platform.reviewEnabled,
        createdAt: platform.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating platform:', error);
    res.status(500).json({ error: 'Server error while creating platform' });
  }
};


const getAllPlatforms = async (req, res) => {
  try {
    const platforms = await Platform.find().select('name reviewEnabled createdAt');
    res.status(200).json({
      message: 'Platforms retrieved successfully',
      platforms: platforms.map(platform => ({
        id: platform._id,
        name: platform.name,
        reviewEnabled: platform.reviewEnabled,
        createdAt: platform.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Server error while fetching platforms' });
  }
};

const updatePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, reviewEnabled } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Platform name is required' });
    }

    const platform = await Platform.findById(id);
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    platform.name = name.trim();
    platform.reviewEnabled = !!reviewEnabled;
    await platform.save();

    res.status(200).json({
      message: 'Platform updated successfully',
      platform: {
        id: platform._id,
        name: platform.name,
        reviewEnabled: platform.reviewEnabled,
        createdAt: platform.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating platform:', error);
    res.status(500).json({ error: 'Server error while updating platform' });
  }
};

const deletePlatform = async (req, res) => {
  try {
    const { id } = req.params;

    const platform = await Platform.findByIdAndDelete(id);
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.status(200).json({ message: 'Platform deleted successfully' });
  } catch (error) {
    console.error('Error deleting platform:', error);
    res.status(500).json({ error: 'Server error while deleting platform' });
  }
};

module.exports = { createPlatform, getAllPlatforms, updatePlatform, deletePlatform };

