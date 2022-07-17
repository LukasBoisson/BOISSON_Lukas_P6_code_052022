const Sauce = require("../models/sauce");
const fs = require("fs");
const httpStatus = require("http-status");
const dotenv = require("dotenv");
const sauce = require("../models/sauce");
dotenv.config();

const regExp = /^[a-zA-Z0-9 _.,&-]+$/;

// Handle image deletion
function handleImageDeletion(filename) {
  fs.unlinkSync(`${process.env.IMGFILE}/${filename}`);
}

// create sauce
exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  if (
    regExp.test(sauceObject.name) &&
    regExp.test(sauceObject.manufacturer) &&
    regExp.test(sauceObject.description) &&
    regExp.test(sauceObject.mainPepper) &&
    !!req.file
  ) {
    const sauceToCreate = new Sauce({
      ...sauceObject,
      likes: 0,
      dislikes: 0,
      usersLiked: [],
      usersDisliked: [],
      imageUrl: req.file.filename,
    });
    sauceToCreate
      .save()
      .then(() => res.status(httpStatus.CREATED).json({ message: "Registered sauce" }))
      .catch((error) => {
        handleImageDeletion(filename);
        return res.status(httpStatus.BAD_REQUEST).json({ error, message: "Creation failed" });
      });
  } else {
    if (!!req.file) handleImageDeletion(req.file.filename);
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "The form fields must be filled in correctly" });
  }
};

// modify sauce
exports.modifySauce = async (req, res, next) => {
  const idUserCreator = await Sauce.findOne({ _id: req.params.id })
    .then((sauce) => sauce.userId)
    .catch((error) => {
      return res.status(httpStatus.NOT_FOUND).json({
        error: error,
      });
    });

  const idAuth = req.auth.userId;
  if (idUserCreator === idAuth) {
    let sauceObject = {};

    if (req.file) {
      sauceObject = {
        ...JSON.parse(req.body.sauce),
        imageUrl: req.file.filename,
      };
    } else {
      sauceObject = {
        ...req.body,
      };
    }

    if (
      !regExp.test(sauceObject.name) ||
      !regExp.test(sauceObject.manufacturer) ||
      !regExp.test(sauceObject.description) ||
      !regExp.test(sauceObject.mainPepper) ||
      sauceObject.likes ||
      sauceObject.dislikes ||
      sauceObject.usersLiked ||
      sauceObject.usersDisliked ||
      sauceObject.userId
    ) {
      if (req.file) handleImageDeletion(req.file.filename);
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "The form fields must be filled in correctly" });
    }

    const filenameFromDb = await Sauce.findOne({ _id: req.params.id })
      .then((sauce) => sauce.imageUrl)
      .catch((error) => {
        return res.status(httpStatus.NOT_FOUND).json({
          error: error,
        });
      });
    console.log(sauceObject);
    Sauce.updateOne(
      {
        _id: req.params.id,
      },
      {
        ...sauceObject,
        _id: req.params.id,
      }
    )

      .then(() => {
        return res.status(httpStatus.OK).json({
          message: "The sauce has been updated",
        });
      })

      .catch((error) => {
        if (req.file) handleImageDeletion(req.file.filename);
        return res.status(httpStatus.BAD_REQUEST).json({
          error,
          message: "Update failed",
        });
      });
    if (sauceObject.imageUrl) {
      handleImageDeletion(filenameFromDb);
    }
  } else {
    if (!!req.file) handleImageDeletion(req.file.filename);
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "Only the creator can modify his sauce" });
  }
};

// delete sauce
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const filename = sauce.imageUrl;
      const idUserCreator = sauce.userId;
      const idAuth = req.auth.userId;
      if (idUserCreator === idAuth) {
        fs.unlink(`${process.env.IMGFILE}/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => res.status(httpStatus.OK).json({ message: "Deleted sauce" }))
            .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "The sauce has not been removed" }));
        });
      } else {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Only the creator can delete his sauce" });
      }
    })
    .catch((error) => res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error, message: "The sauce has not been found" }));
};

// get one sauce
exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      const saucetoReturn = {
        ...sauce.toObject(),
        imageUrl: `${req.protocol}://${req.get("host")}/${process.env.IMGFILE}/${sauce.imageUrl}`,
      };
      return res.status(httpStatus.OK).json(saucetoReturn);
    })
    .catch((error) => res.status(httpStatus.NOT_FOUND).json({ error, message: "The sauce has not been found" }));
};

// get all sauces
exports.getAllSauce = (req, res, next) => {
  Sauce.find()
    .then((allSauces) => {
      allSauces.forEach((sauce) => {
        sauce.imageUrl = `${req.protocol}://${req.get("host")}/${process.env.IMGFILE}/${sauce.imageUrl}`;
      });
      return res.status(httpStatus.OK).json(allSauces);
    })
    .catch((error) => res.status(httpStatus.NOT_FOUND).json({ error, message: "The sauces have not been found" }));
};

// handle like/dislike
exports.likeSauce = (req, res, next) => {
  const sauceId = req.params.id;
  const likeStatus = req.body.like;
  const userId = req.body.userId;

  if (likeStatus === 1) {
    Sauce.findOne({ _id: sauceId }).then((sauce) => {
      if (sauce.usersLiked.includes(userId)) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Like already added, only one like is allowed per product for a user",
        });
      } else {
        Sauce.updateOne({
          $inc: { likes: +1 },
          $push: { usersLiked: userId },
        })
          .then(() => res.status(httpStatus.OK).json({ message: "Like added" }))
          .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "Like not added" }));
      }
    });
  } else if (likeStatus === 0) {
    Sauce.findOne({ _id: sauceId })
      .then((sauce) => {
        if (sauce.usersLiked.includes(userId)) {
          Sauce.updateOne(
            { _id: sauceId },
            {
              $inc: { likes: -1 },
              $pull: { usersLiked: userId },
            }
          )
            .then(() => res.status(httpStatus.OK).json({ message: "Like removed" }))
            .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "Like not removed" }));
        } else if (sauce.usersDisliked.includes(userId)) {
          Sauce.updateOne(
            { _id: sauceId },
            {
              $inc: { dislikes: -1 },
              $pull: { usersDisliked: userId },
            }
          )
            .then(() => res.status(httpStatus.OK).json({ message: "Dislike removed" }))
            .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "Dislike not removed" }));
        }
      })
      .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "Sauce not found" }));
  } else {
    Sauce.findOne({ _id: sauceId }).then((sauce) => {
      if (sauce.usersDisliked.includes(userId)) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Dislike already added, only one dislike is allowed per product for a user",
        });
      } else {
        Sauce.updateOne({
          $inc: { Dislikes: -1 },
          $push: { usersDisliked: userId },
        })
          .then(() => res.status(httpStatus.OK).json({ message: "Dislike added" }))
          .catch((error) => res.status(httpStatus.BAD_REQUEST).json({ error, message: "Dislike not added" }));
      }
    });
  }
};
