/*
Navicat MySQL Data Transfer

Source Server         : cc
Source Server Version : 50720
Source Host           : localhost:3306
Source Database       : db_picture_collection

Target Server Type    : MYSQL
Target Server Version : 50720
File Encoding         : 65001

Date: 2020-06-17 22:00:18
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for tb_file
-- ----------------------------
DROP TABLE IF EXISTS `tb_file`;
CREATE TABLE `tb_file` (
  `id` varchar(255) NOT NULL,
  `sid` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `filesize` double unsigned NOT NULL,
  `surl` varchar(255) NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id,sid` (`id`,`sid`) USING BTREE,
  KEY `sid` (`sid`),
  CONSTRAINT `sid` FOREIGN KEY (`sid`) REFERENCES `tb_host` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for tb_host
-- ----------------------------
DROP TABLE IF EXISTS `tb_host`;
CREATE TABLE `tb_host` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id` (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
