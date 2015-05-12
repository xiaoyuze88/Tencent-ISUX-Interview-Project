/**
 *      模拟接口，提供获取地图数据的伪接口
 *
 */

define(function() {

    var mapApi = (function() {

        // 图片地址前缀
        var ROOT_PATH = 'images/';

        // 模拟地图块数据
        var MapData = {
            1: {
                '1_1': ROOT_PATH + '1_1.jpg',
                '1_2': ROOT_PATH + '1_2.jpg',
                '1_3': ROOT_PATH + '1_3.jpg',
                '1_4': ROOT_PATH + '1_4.jpg',
                '2_1': ROOT_PATH + '2_1.jpg',
                '2_2': ROOT_PATH + '2_2.jpg',
                '2_3': ROOT_PATH + '2_3.jpg',
                '2_4': ROOT_PATH + '2_4.jpg',
                '3_1': ROOT_PATH + '3_1.jpg',
                '3_2': ROOT_PATH + '3_2.jpg',
                '3_3': ROOT_PATH + '3_3.jpg',
                '3_4': ROOT_PATH + '3_4.jpg'
            },
            2: {
                '1_1': ROOT_PATH + '4_1.jpg',
                '1_2': ROOT_PATH + '4_2.jpg',
                '1_3': ROOT_PATH + '4_3.jpg',
                '1_4': ROOT_PATH + '4_4.jpg',
                '1_5': ROOT_PATH + '5_1.jpg',
                '1_6': ROOT_PATH + '5_2.jpg',
                '1_7': ROOT_PATH + '5_3.jpg',
                '1_8': ROOT_PATH + '5_4.jpg',

                '2_1': ROOT_PATH + '6_1.jpg',
                '2_2': ROOT_PATH + '6_2.jpg',
                '2_3': ROOT_PATH + '6_3.jpg',
                '2_4': ROOT_PATH + '6_4.jpg',
                '2_5': ROOT_PATH + '7_1.jpg',
                '2_6': ROOT_PATH + '7_2.jpg',
                '2_7': ROOT_PATH + '7_3.jpg',
                '2_8': ROOT_PATH + '7_4.jpg',

                '3_1': ROOT_PATH + '8_1.jpg',
                '3_2': ROOT_PATH + '8_2.jpg',
                '3_3': ROOT_PATH + '8_3.jpg',
                '3_4': ROOT_PATH + '8_4.jpg',
                '3_5': ROOT_PATH + '9_1.jpg',
                '3_6': ROOT_PATH + '9_2.jpg',
                '3_7': ROOT_PATH + '9_3.jpg',
                '3_8': ROOT_PATH + '9_4.jpg',

                '4_1': ROOT_PATH + '2_24.jpg',
                '4_2': ROOT_PATH + '10_1.jpg',
                '4_3': ROOT_PATH + '10_2.jpg',
                '4_4': ROOT_PATH + '10_3.jpg',
                '4_5': ROOT_PATH + '10_4.jpg',
                '4_6': ROOT_PATH + '11_1.jpg',
                '4_7': ROOT_PATH + '11_2.jpg',
                '4_8': ROOT_PATH + '11_3.jpg',

                '5_1': ROOT_PATH + '2_32.jpg',
                '5_2': ROOT_PATH + '11_4.jpg',
                '5_3': ROOT_PATH + '12_1.jpg',
                '5_4': ROOT_PATH + '12_2.jpg',
                '5_5': ROOT_PATH + '12_3.jpg',
                '5_6': ROOT_PATH + '12_4.jpg',
                '5_7': ROOT_PATH + '13_1.jpg',
                '5_8': ROOT_PATH + '13_2.jpg',

                '6_1': ROOT_PATH + '2_40.jpg',
                '6_2': ROOT_PATH + '13_3.jpg',
                '6_3': ROOT_PATH + '13_4.jpg',
                '6_4': ROOT_PATH + '14_1.jpg',
                '6_5': ROOT_PATH + '14_2.jpg',
                '6_6': ROOT_PATH + '14_3.jpg',
                '6_7': ROOT_PATH + '14_4.jpg',
                '6_8': ROOT_PATH + '2_47.jpg',
            }
        };

        function getMapFromList(mapList, zoomLevel) {
            var res = {},
                cache;
            // debugger
            for (var i in mapList) {

                // 这里模拟了一个发送请求的过程，
                // 如果是真实的api请求，还需要加上接口onload，onerror等逻辑处理
                if (cache = MapData[zoomLevel][i]) {
                    res[i] = cache;
                }
            }
            return res;
        }

        return {
            getMapFromList: getMapFromList
        }
    })();

    return mapApi;
});
