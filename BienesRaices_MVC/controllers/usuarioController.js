import { check,validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import Usuario from '../models/Usuario.js'
import { generarJWT, generarId } from '../helpers/tokens.js'
import { emailRegistro, emailOlvidePassword } from '../helpers/email.js'
 
const  formularioLogin =  (req, res) => {
    res.render('auth/login', {
        pagina:'Iniciar Sesión',
        csrfToken: req.csrfToken()
    })
}

const autenticar = async (req, res) => {

    // validacion
    await check('email').isEmail().withMessage('El email es obligatorio').run(req)
    await check('password').notEmpty().withMessage('El password es obligatorio').run(req)

    let resultado = validationResult(req) 

    //return res.json(resultado.array())
    // verificar que el resultado este basio
    if(!resultado.isEmpty()) {
        //errores
        return res.render('auth/login', {
            pagina:'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: resultado.array()

        })
    }

    const { email, password} = req.body

    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ where: { email }})
    if(!usuario) {
        return res.render('auth/login', {
            pagina:'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}]
        })
    }

    // Comprobar si el usuario no eata confirmado
    if(!usuario.confirmado) {
        return res.render('auth/login', {
            pagina:'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'Tu cuenta no esta confirmado'}]
        })
    }

    // Revisar el password
    if(!usuario.verificarPassword(password)) {
        return res.render('auth/login', {
            pagina:'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El Password es Incorrecto'}]
        })
    }

    //Autenticar al Usuario
    const token = generarJWT({ id: usuario.id, nombre: usuario.nombre })

    console.log(token)


    //Almacenar en un cookie
    return res.cookie('_token', token, {
        httpOnly: true,
        //secure: true,
        //sameSite    
    }).redirect('/mis-propiedades')
}

const cerrarSesion = (req, res) => {

    return res.clearCookie('_token').status(200).redirect('/auth/login')
}

const  formularioRegistro =  (req, res) => {
    res.render('auth/registro', {
            pagina:'Crear Cuenta',
            csrfToken: req.csrfToken()
    })
}

const registrar = async (req, res) =>  {
    // validacion
    await check('nombre').notEmpty().withMessage('El Nombre no puede ir vacio').run(req)
    await check('email').isEmail().withMessage('Eso no parece un email').run(req)
    await check('password').isLength({ min: 8 }).withMessage('El password debe de ser de al menos 8 caracteres').run(req)
    await check('repetir_password').equals(req.body.password).withMessage('Los password deben ser iguales').run(req)

    let resultado = validationResult(req) 

    //return res.json(resultado.array())
    // verificar que el resultado este vacio
    if(!resultado.isEmpty()) {
        //errores
        return res.render('auth/registro', {
            pagina:'Crear cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }
    // extraer los datos
    const { nombre, email, password } = req.body
   
    // Verificar que el usuario no existe
    const existeUsuario = await Usuario.findOne({ where : { email }})
    if(existeUsuario) {
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario ya esta registrado'}],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }

// Almacenar un usuario
const usuario = await Usuario.create({
    nombre,
    email,
    password,
    token: generarId()  
})

// Envia email de confirmación
emailRegistro({
    nombre: usuario.nombre,
    email: usuario.email,
    token: usuario.token
})

// Mostrar mensaje de confirmacion
res.render('templates/mensaje',{
    pagina:'Cuenta creada correctamenete',
    mensaje:'Hemos enviado un mensaje de confirmación,pesione en el enlace'
})
}

// funcion que controla una cuenta
const confirmar = async (req, res) => {

    const { token } = req.params;


    // Verificar si el token es valido
    const usuario = await Usuario.findOne({ where: {token}})

    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina:'Error al confirmar tu cuenta',
            mensaje:'Hubo un error al confirmar tu cuenta, intenta de nuevo',
            error: true  
        })
    }

    //Confirmar la cuenta
    usuario.token = null;
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina:'Cuenta confirmada',
        mensaje:'La cuenta se confirmo correctamente',
        
    })
}

const  formularioOlvidePassword =  (req, res) => {
    res.render('auth/olvide-password', {
        pagina:'Recupera tu acceso a Bienes Raices',
        csrfToken: req.csrfToken(),
    })
}

const resetPassword = async (req, res) => {
    //  validacion
    await check('email').isEmail().withMessage('Eso no parece un email').run(req)

    let resultado = validationResult(req) 

    //return res.json(resultado.array())
    // verificar que el resultado este basio
    if(!resultado.isEmpty()) {
         //errores
        return res.render('auth/olvide-password', {
            pagina:'Recupera tu acceso a Bienes Raices',
            csrfToken: req.csrfToken(),
            errores: resultado.array()
            
        })
    }

    // Busca Usuario

    const { email } = req.body
    const usuario = await Usuario.findOne({ where: { email}} )
    if(!usuario) {
        return res.render('auth/olvide-password', {
            pagina:'Recupera tu acceso a Bienes Raices',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El email no pertenece a ningun ususario'}]
            
        })
    }

    //Generar token y enviar email
    usuario.token = generarId();
    await usuario.save();

    // Enviar un email
    emailOlvidePassword({
        email: usuario.email,
        nombre: usuario.nombre,
        token: usuario.token


    })

    // Renderizar un mensaje
    res.render('templates/mensaje',{
        pagina:'reestablece tu password',
        mensaje:'Hemos enviadom un email con  las instrucciones'
    })

}
const comprobarToken = async (req, res) => {
    
    const { token } = req.params;

    const usuario = await Usuario.findOne({where: {token}})
    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina:'Reestablece tu password',
            mensaje:'Hubo un error al validar tu informacion, intenta de nuevo',
            error: true  
        })
    }
 
    // Mostrar formulario para modificar el password
    res.render('auth/reset-password', {
        pagina:'Reestablece tu password',
        csrfToken: req.csrfToken()
    })
}

const nuevoPassword = async (req, res) => {
    // Validar el nuevo password

    await check('password').isLength({ min: 8 }).withMessage('El password debe de ser de al menos 8 caracteres').run(req)

    let resultado = validationResult(req) 

    // verificar que el resultado este basio
    if(!resultado.isEmpty()) {
        //errores
        return res.render('auth/reset-password', {
            pagina:'Reestablece tu password',
            csrfToken: req.csrfToken(),
            errores: resultado.array()

        })
    }

    const { token } = req.params
    const { password } = req.body;

    // Identificar quien hace el cambio
    const usuario = await Usuario.findOne({where: {token}})

    // Hashear nuevo passwor
    const salt = await bcrypt.genSalt(10)
    usuario.password = await bcrypt.hash (password, salt);
    usuario.token = null;

    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina:'Password Reestablecido',
        mensaje: 'El password se guardo correctamente'
    })

    console.log(Usuario)

}

export {
    formularioLogin,
    autenticar,
    cerrarSesion,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken,
    nuevoPassword

}