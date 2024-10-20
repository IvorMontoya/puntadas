import bcrypt from 'bcrypt'

const usuarios = [
    {
        nombre: 'Ivor',
        email: 'ivormontoya@gmail.com',
        confirmado: 1,
        password: bcrypt.hashSync('password', 10)
    },
    {
        nombre: 'Jose',
        email: 'ivormontoya@hotmail.com',
        confirmado: 1,
        password: bcrypt.hashSync('password', 10)
    }
    

]

export default usuarios