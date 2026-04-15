const mongoose = require('mongoose');

class SchemaManager {
  static async cleanupIndexes(collection, indexField) {
    try {
      const indexes = await collection.indexes();
      for (let index of indexes) {
        if (index.key[indexField] !== undefined) {
          console.log(`Dropping ${indexField} index:`, index.name);
          await collection.dropIndex(index.name);
        }
      }
    } catch (error) {
      console.log(`No indexes to clean up for collection:`, error.message);
    }
  }

  static async cleanupAllSignupIndexes() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        if (collection.name.toLowerCase().startsWith('signup_')) {
          console.log(`Cleaning up indexes for collection: ${collection.name}`);
          const model = mongoose.connection.collection(collection.name);
          await SchemaManager.cleanupIndexes(model, 'userName');
        }
      }
      console.log('All signup collection indexes cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up signup indexes:', error);
      throw error;
    }
  }

  static async cleanupAllFTDIndexes() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        if (collection.name.toLowerCase().startsWith('ftd_')) {
          console.log(`Cleaning up indexes for collection: ${collection.name}`);
          const model = mongoose.connection.collection(collection.name);
          await SchemaManager.cleanupIndexes(model, 'userName');
        }
      }
      console.log('All FTD collection indexes cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up FTD indexes:', error);
      throw error;
    }
  }

  // Utility method to clean up both signup and FTD indexes
  static async cleanupAllIndexes() {
    try {
      await SchemaManager.cleanupAllSignupIndexes();
      await SchemaManager.cleanupAllFTDIndexes();
      console.log('All indexes cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up indexes:', error);
      throw error;
    }
  }
}

module.exports = SchemaManager;