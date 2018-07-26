var express = require('express');
var router = express.Router();
var DButilsAzure = require('../DButils');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
const superSecret = "OurSecretKeyIsTheBest!"; // secret variable

// route middleware to verify a token
router.use('/', function (req, res, next) {

    // check header or url parameters or post parameters for token
    console.log("middlewareeeee!")
    if(req.body.poi_name)
        console.log(req.body.poi_name);


    var token = req.body.token || req.query.token || req.headers['token'];
    console.log("token is " + token);
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, superSecret, function (err, decoded) {
            if (err) {
                console.log("failed to authenticateeee  " + token);
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                // get the decoded payload and header
                var decoded = jwt.decode(token, {complete: true});
                if((decoded.payload.exp) < (Date.now()/1000)){
                    return res.json({success: false, message: 'Token expired'});
                }
                else{
                    req.decoded= decoded;
                    req.token = token;
                    console.log(decoded.payload.userName);
                    req.userName = decoded.payload.userName;
                    console.log(decoded.header);
                    console.log(decoded.payload);
                    console.log("NEXT");
                    next();
                }
            }
        });

    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }

})

router.get('/getUserName', function(req,res){
    var decoded = jwt.decode(req.token, {complete: true});
    console.log("after getusername in server")
    return res.json({ success: true, message: decoded.payload });
})

router.put('/reorder', function(req, res)
{
    var pois = req.body.pois;
    var promises = [];
    for(var i = 0; i < pois.length; i++)
    {
        promises.push(DButilsAzure.execQuery("UPDATE POIsForUser SET Position = '"+i+"' WHERE POI_name = '"+pois[i]+"' AND UserName = '"+req.userName+"'"));   
    }
    Promise.all(promises).then(function(recordSet){
        res.json({
            success: true,
            message: "POIs reordered."
        })
        }).catch(function (err) {
            res.send(err);
        });
})

router.post('/savePOI', function(req,res){
    var poi_name = req.body.poi_name;
    DButilsAzure.execQuery("SELECT * FROM POIsForUser WHERE POI_name = '"+poi_name+"' AND UserName = '"+req.userName+"'").then(function (recordSet) {   
        if(recordSet == 0){
            DButilsAzure.execQuery("UPDATE RegisteredUsers SET NumOfFavorites = NumOfFavorites + 1 WHERE UserName = '"+req.userName+"'").then(function (recordSet) {   
            }).catch(function (err) {
                res.send(err);
                    });
            DButilsAzure.execQuery("INSERT INTO POIsForUser (POI_name, UserName, CreatedAt) VALUES ('"+poi_name+"','"+req.userName+"', GETDATE())").then(function (recordSet) {   
                res.json({ success: true, message: 'Point of interest is saved to favorites.' });
            }).catch(function (err) {
               res.send(err);
               });
        }
        else{
            res.json({success: false, message: "Point of interest already exists"});
        }
    }).catch(function(err){
        res.send(err)
    })
   

    
})

router.delete('/removePOI/:name', function(req,res){
    var poi_name = req.params.name;
    console.log("DELETE POI1: "+ poi_name);

    DButilsAzure.execQuery("IF EXISTS (SELECT POI_name FROM POIsForUser WHERE POI_name = '"+poi_name+"' AND UserName = '"+req.userName+"') BEGIN UPDATE RegisteredUsers SET NumOfFavorites = NumOfFavorites - 1 WHERE UserName = '"+req.userName+"' END").then(function (recordSet) {   
    }).catch(function (err) {
        res.send(err);
            });
    DButilsAzure.execQuery("DELETE FROM POIsForUser WHERE POI_name = '"+poi_name+"' AND UserName = '"+req.userName+"'; SELECT @@rowcount 'rowCount'").then(function (recordSet) {   
         if(recordSet[0].rowCount == 1){
            res.json({ success: true, message: 'Point of interest is removed from favorites.' });
        }
        else{
            res.json({ success: false, message: 'The point of interest does not exist in the system.' });
        }
    }).catch(function (err) {
    res.send(err);
        });

})

router.get('/getPOIs', function(req,res){
    DButilsAzure.execQuery("SELECT POI.POI_name, Position FROM POIsForUser JOIN POI ON POIsForUser.POI_name=POI.POI_name WHERE UserName = '"+req.userName+"'").then(function (recordSet) {   
        res.json(recordSet);
   }).catch(function (err) {
    res.send(err);
        });
})

router.get('/get2MostPopularPOIs', function(req,res){
   DButilsAzure.execQuery("DECLARE @category VARCHAR(100), @poi_name1 VARCHAR(100), @poi_name2 VARCHAR(100); SELECT @poi_name1=POI_name, @category=POI.Category FROM CategoriesForUser JOIN POI ON CategoriesForUser.CategoryName = POI.Category WHERE UserName = '"+req.userName+"' AND POI_rank = (SELECT MAX(POI_rank) FROM CategoriesForUser JOIN POI ON CategoriesForUser.CategoryName = POI.Category); SELECT @poi_name2 = POI.POI_name FROM CategoriesForUser JOIN POI ON CategoriesForUser.CategoryName = POI.Category WHERE UserName = '"+req.userName+"' AND POI.Category <> @category AND POI_rank = (SELECT MAX(POI_rank) FROM CategoriesForUser JOIN POI ON CategoriesForUser.CategoryName = POI.Category WHERE POI.Category <> @category); SELECT POI_name, PicturePath FROM POI WHERE POI_name=@poi_name1; SELECT POI_name, PicturePath FROM POI WHERE POI_name=@poi_name2").then(function(recordSet){
        res.json(recordSet);
   }).catch(function (err) {
    res.send(err);
        });    
})

 router.put('/reviewPOI', function(req,res){
    var poi_name = req.body.poi_name;
    var review = req.body.review;
    DButilsAzure.execQuery("UPDATE POI SET DateReview2 = DateReview1, Review2 = Review1, DateReview1 = GETDATE(), Review1 ='"+review+"' WHERE POI_name='"+poi_name+"'").then(function (recordSet) {   
        return res.json({ success: true, message: 'Your review is submitted.' });
    }).catch(function (err) {
        res.send(err);
            });
    
})

router.put('/rankPOI', function(req,res){
    var poi_name = req.body.poi_name;
    var rank = req.body.rank;
    var rankAsNum = parseFloat(rank) * 20;
    rank = rankAsNum;
    if(rankAsNum < 0 || rankAsNum > 100){
        res.json({ success: false, message: 'Please enter a number between 0 to 100.' });
    }
    else{
        DButilsAzure.execQuery("DECLARE @numOfRanks INT, @currentRank FLOAT; SELECT @numOfRanks=NumOfRanks, @currentRank=POI_rank FROM POI WHERE POI_name='"+poi_name+"'; UPDATE POI SET POI_rank=(@currentRank*@numOfRanks+'"+rank+"')/(@numOfRanks+1) WHERE POI_name='"+poi_name+"';UPDATE POI SET NumOfRanks = NumOfRanks + 1 WHERE POI_name='"+poi_name+"'").then(function (recordSet) {   
            return res.json({ success: true, message: 'Your rank is submitted.' });
        }).catch(function (err) {
            res.send(err);
        });
    }
})
module.exports = router;