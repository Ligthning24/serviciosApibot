const verificar = (req, res) => {

    try {
        var tokenandercode = "ANDERCODENODEJSAPIMETA";
        var token = req.query["hub.verify_token"];
        var challenge = req.query["hub.challenge"];

        res.send(challenge);
        console.log(req);
    }catch (e){
        res.status(400).send();
    }

    res.send('Verificando');
    console.log('Verificador de consola');
}

const recibir = (req, res) => {
    res.send('Recibiendo');
    console.log('Recibidor de consola');
}

module.exports = {
    verificar,
    recibir
};