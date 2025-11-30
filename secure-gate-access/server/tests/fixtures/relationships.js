import { generateRealisticUser, generateRealisticVisitor } from '../helpers/mockData.enhanced.js';

export function createResidentVisitorRelationship(options = {}) {
  const resident = options.resident || generateRealisticUser('resident', {});
  const visitor = options.visitor || generateRealisticVisitor({});

  return {
    resident,
    visitor,
    relationship: {
      hostEmail: resident.email,
      visitorEmail: visitor.email,
      createdAt: new Date()
    }
  };
}

export default {
  createResidentVisitorRelationship
};
