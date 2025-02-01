const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  
function randomName() {
    return Math.random().toString(36).substring(2, 12);
    }


// Create admin user
async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }
  
  async function getAdminAuth() {
      const adminUser = await createAdminUser();
      const loginRes = await request(app).put('/api/auth').send(adminUser);
      return [loginRes.body.token, adminUser.email];
  }
  

let franchise = {id: 1, name: 'pizzaPocket', stores: [{id: 1, name: 'SLC'},{id: 2, name: "The 'Couve"} ]}



// test get franchises
test('getFranchises', async () => {
    const getFranchisesRes = await request(app).get('/api/franchise');
    expect(getFranchisesRes.status).toBe(200);
    expect(getFranchisesRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining(franchise)
        ]))
});



// test getUserFranchises

test('createFranchise', createFranchise);

async function createFranchise() {
    let adminfo = await getAdminAuth();
    let token = adminfo[0];
    let email = adminfo[1];
    let randomFranchice = randomName();
    let newFranchise = { name: randomFranchice, admins: [{email: email}]}
    const createFranchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${token}`).send(newFranchise);
    expect(createFranchiseRes.status).toBe(200);
    expect(createFranchiseRes.body).toMatchObject({name: randomFranchice, admins: [{email: email}]})
    return [email, token, createFranchiseRes.body.id];
}




// // test delete franchise
test('deleteFranchise', async () => {
    let franchiseOwnerInfo = await createFranchise();
    let token = franchiseOwnerInfo[1];
    let franchiseId = franchiseOwnerInfo[2];
    const deleteFranchiseRes = await request(app).delete(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${token}`);
    expect(deleteFranchiseRes.status).toBe(200);
    expect(deleteFranchiseRes.body).toMatchObject({message: 'franchise deleted'});
});


test('createStore', async () => {
    let franchiseOwnerInfo = await createFranchise();
    let email = franchiseOwnerInfo[0];
    let token = franchiseOwnerInfo[1];
    let franchiseId = franchiseOwnerInfo[2];
    let newStore = {name: randomName(), admins: [{email: email}]}
    const createStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${token}`).send(newStore);
    expect(createStoreRes.status).toBe(200);
    expect(createStoreRes.body).toMatchObject({name: newStore.name});
});




