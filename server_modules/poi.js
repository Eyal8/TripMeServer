var express = require('express');
var router = express.Router();
var DButilsAzure = require('../DButils');

router.get('/get3PopRand', function(req, res){
    DButilsAzure.execQuery("SELECT TOP 3 * FROM POI WHERE POI_rank >= 70 ORDER BY NEWID()").then(function (recordSet) {   
        res.json(recordSet);
   }).catch(function (err) {
    res.send(err);
        });
})

router.get('/all', function(req,res){
        DButilsAzure.execQuery("SELECT POI_name, PicturePath, Category FROM POI").then(function (recordSet) {   
        res.json(recordSet);
   }).catch(function (err) {
    res.send(err);
        });
    
})

router.get('/:name', function(req,res){
    var name = req.params.name;
    var promises = [];
    promises.push(DButilsAzure.execQuery("SELECT * FROM POI WHERE POI_name = '"+name+"'"));     
    promises.push(DButilsAzure.execQuery("UPDATE POI SET NumOfViews = NumOfViews + 1 WHERE POI_name = '"+name+"'"));
    Promise.all(promises).then(function(recordSet){
        if(recordSet[0].length == 0)
        {
            res.json({success: false, message:"There is no such point of interest"});
        }
        else
        {
            res.json({
                success: true,
                POI_name: recordSet[0][0].POI_name,
                NumOfViews: recordSet[0][0].NumOfViews,
                POI_description: recordSet[0][0].POI_description,
                POI_rank: recordSet[0][0].POI_rank,
                Review1: recordSet[0][0].Review1,
                Review2: recordSet[0][0].Review2,
                DateReview1:recordSet[0][0].DateReview1,
                DateReview2:recordSet[0][0].DateReview2,
                PicturePath: recordSet[0][0].PicturePath,
                Category: recordSet[0][0].Category,
                Latitude: recordSet[0][0].Latitude,
                Longitude: recordSet[0][0].Longitude
            })
        }
        }).catch(function (err) {
            res.send(err);
                });  
})


module.exports = router;